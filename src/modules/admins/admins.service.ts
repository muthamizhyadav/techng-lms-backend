import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminDocument } from './entities/admin.entity';
import { PasswordUtil } from '@common/utils/password.util';
import { AdminRole, AdminStatus } from '@shared/enums/user-status.enum';
import {
  CreateAdminDto,
  UpdateAdminDto,
  UpdateAdminPasswordDto,
  UpdateAdminRoleDto,
  UpdateAdminStatusDto,
} from './dto/admin.dto';

@Injectable()
export class AdminsService {
  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    private readonly configService: ConfigService,
  ) {}

  async countAll(): Promise<number> {
    return this.adminModel.countDocuments({ deletedAt: null });
  }

  async create(
    createAdminDto: CreateAdminDto,
    createdByAdminId: string,
  ): Promise<Admin> {
    const existingAdmin = await this.findByEmail(createAdminDto.email);
    if (existingAdmin) {
      throw new ConflictException(
        'Email address is already registered as admin',
      );
    }

    if (createAdminDto.phone) {
      const phoneExists = await this.adminModel.findOne({
        phone: createAdminDto.phone,
        deletedAt: null,
      });
      if (phoneExists) {
        throw new ConflictException('Phone number is already registered');
      }
    }

    let permissions = createAdminDto.permissions;
    if (!permissions || permissions.length === 0) {
      permissions = this.getDefaultPermissions(createAdminDto.role);
    }

    const hashedPassword = await PasswordUtil.hash(
      createAdminDto.password,
      this.configService.get('app.bcryptRounds'),
    );

    const savedAdmin = await this.adminModel.create({
      ...createAdminDto,
      password: hashedPassword,
      permissions,
      createdByAdminId: createdByAdminId || null,
      loginCount: 0,
    });

    return savedAdmin.toJSON() as Admin;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Admin[]; total: number; page: number; limit: number }> {
    const filter = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.adminModel
        .find(filter)
        .select(
          'email firstName lastName phone avatar role status permissions department designation loginCount lastLoginAt lastActiveAt createdAt updatedAt createdByAdminId',
        )
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.adminModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<AdminDocument> {
    const admin = await this.adminModel
      .findOne({ _id: id, deletedAt: null })
      .populate('createdBy', 'firstName lastName email');

    if (!admin) {
      throw new NotFoundException(`Admin with ID "${id}" not found`);
    }

    return admin;
  }

  async findByEmail(email: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ email, deletedAt: null });
  }

  async findByEmailWithPassword(email: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ email, deletedAt: null });
  }

  async update(
    id: string,
    updateAdminDto: UpdateAdminDto,
    currentAdminId: string,
  ): Promise<Admin> {
    const admin = await this.findOne(id);

    if (id !== currentAdminId) {
      const currentAdmin = await this.findOne(currentAdminId);
      if (!currentAdmin.isSuperAdmin()) {
        throw new ForbiddenException(
          'Only Super Admin can update other admins',
        );
      }
    }

    if (updateAdminDto.phone && updateAdminDto.phone !== admin.phone) {
      const phoneExists = await this.adminModel.findOne({
        phone: updateAdminDto.phone,
        deletedAt: null,
      });
      if (phoneExists) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    Object.assign(admin, updateAdminDto, {
      updatedByAdminId: currentAdminId,
    });
    const updatedAdmin = await admin.save();
    return updatedAdmin.toJSON() as Admin;
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdateAdminPasswordDto,
  ): Promise<void> {
    const admin = await this.adminModel.findById(id);

    if (!admin || admin.deletedAt) {
      throw new NotFoundException('Admin not found');
    }

    const isCurrentPasswordValid = await PasswordUtil.compare(
      updatePasswordDto.currentPassword,
      admin.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await PasswordUtil.hash(
      updatePasswordDto.newPassword,
      this.configService.get('app.bcryptRounds'),
    );

    await this.adminModel.findByIdAndUpdate(id, {
      password: hashedNewPassword,
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateAdminStatusDto,
    currentAdminId: string,
  ): Promise<AdminDocument> {
    const admin = await this.findOne(id);

    if (id === currentAdminId) {
      throw new ForbiddenException('You cannot change your own status');
    }

    if (
      admin.role === AdminRole.SUPER_ADMIN &&
      dto.status === AdminStatus.SUSPENDED
    ) {
      const superAdminCount = await this.adminModel.countDocuments({
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
        deletedAt: null,
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenException(
          'Cannot suspend the last active Super Admin',
        );
      }
    }

    await this.adminModel.findByIdAndUpdate(id, {
      status: dto.status,
      updatedByAdminId: currentAdminId,
    });

    return this.findOne(id);
  }

  async updateRole(
    id: string,
    dto: UpdateAdminRoleDto,
    currentAdminId: string,
  ): Promise<AdminDocument> {
    const admin = await this.findOne(id);
    if (id === currentAdminId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    if (
      admin.role === AdminRole.SUPER_ADMIN &&
      dto.role !== AdminRole.SUPER_ADMIN
    ) {
      const superAdminCount = await this.adminModel.countDocuments({
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
        deletedAt: null,
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenException('Cannot demote the last Super Admin');
      }
    }

    const permissions =
      dto.permissions && dto.permissions.length > 0
        ? dto.permissions
        : this.getDefaultPermissions(dto.role);

    await this.adminModel.findByIdAndUpdate(id, {
      role: dto.role,
      permissions,
      updatedByAdminId: currentAdminId,
    });

    return this.findOne(id);
  }

  async remove(id: string, currentAdminId: string): Promise<void> {
    const admin = await this.findOne(id);

    if (id === currentAdminId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    if (admin.role === AdminRole.SUPER_ADMIN) {
      const superAdminCount = await this.adminModel.countDocuments({
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
        deletedAt: null,
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last Super Admin');
      }
    }

    await this.adminModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  }

  async updateRefreshToken(
    adminId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const refreshTokenHash = refreshToken
      ? await PasswordUtil.hash(
          refreshToken,
          this.configService.get('app.bcryptRounds'),
        )
      : null;

    await this.adminModel.findByIdAndUpdate(adminId, { refreshTokenHash });
  }

  async verifyRefreshToken(
    adminId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const admin = await this.adminModel.findById(adminId);

    if (!admin || !admin.refreshTokenHash) return false;

    return PasswordUtil.compare(refreshToken, admin.refreshTokenHash);
  }

  async updateLastLogin(adminId: string, ipAddress?: string): Promise<void> {
    await this.adminModel.findByIdAndUpdate(adminId, {
      $set: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        lastLoginIp: ipAddress || null,
      },
      $inc: { loginCount: 1 },
    });
  }

  async updateLastActive(adminId: string): Promise<void> {
    await this.adminModel.findByIdAndUpdate(adminId, {
      lastActiveAt: new Date(),
    });
  }

  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    const admin = await this.findOne(adminId);
    return admin.can(permission);
  }

  async getAdminStats(): Promise<{
    totalAdmins: number;
    activeAdmins: number;
    byRole: Record<string, number>;
    recentLogins: number;
  }> {
    const totalAdmins = await this.adminModel.countDocuments({
      deletedAt: null,
    });
    const activeAdmins = await this.adminModel.countDocuments({
      status: AdminStatus.ACTIVE,
      deletedAt: null,
    });

    const roleCounts: Record<string, number> = {};
    for (const role of Object.values(AdminRole)) {
      const count = await this.adminModel.countDocuments({
        role,
        deletedAt: null,
      });
      roleCounts[role] = count;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogins = await this.adminModel.countDocuments({
      lastLoginAt: { $gte: sevenDaysAgo },
      deletedAt: null,
    });

    return { totalAdmins, activeAdmins, byRole: roleCounts, recentLogins };
  }

  private getDefaultPermissions(role: AdminRole): string[] {
    const allPermissions = [
      'course.create',
      'course.edit',
      'course.delete',
      'course.view',
      'student.view',
      'student.edit',
      'student.suspend',
      'student.delete',
      'batch.create',
      'batch.edit',
      'batch.delete',
      'batch.view',
      'payment.view',
      'payment.refund',
      'payment.create',
      'trainer.create',
      'trainer.edit',
      'trainer.delete',
      'trainer.view',
      'admin.create',
      'admin.edit',
      'admin.delete',
      'admin.view',
      'report.view',
      'report.export',
      'settings.manage',
    ];

    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return allPermissions;

      case AdminRole.ADMIN:
        return [
          'course.create',
          'course.edit',
          'course.view',
          'student.view',
          'student.edit',
          'batch.create',
          'batch.edit',
          'batch.view',
          'payment.view',
          'trainer.view',
          'report.view',
          'report.export',
        ];

      case AdminRole.SUPPORT:
        return ['student.view', 'student.edit', 'batch.view', 'report.view'];

      case AdminRole.FINANCE:
        return [
          'payment.view',
          'payment.refund',
          'payment.create',
          'student.view',
          'report.view',
          'report.export',
        ];

      default:
        return [];
    }
  }
}
