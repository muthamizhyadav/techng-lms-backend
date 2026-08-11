// src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@modules/users/users.service';
import { AdminsService } from '@modules/admins/admins.service';
import { PasswordUtil } from '@common/utils/password.util';
import { StudentJwtPayload, AdminJwtPayload } from '@shared/interfaces/jwt-payload.interface';
import { User } from '@modules/users/entities/user.entity';
import { Admin } from '@modules/admins/entities/admin.entity';
import { AdminRole } from '@shared/enums/user-status.enum';
import { RefreshTokenDto, StudentLoginDto, StudentRegisterDto } from './dto/auth.dto';
import { AdminLoginDto, AdminRegisterDto } from '../admins/dto/admin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly adminsService: AdminsService,
  ) {}

  async studentRegister(dto: StudentRegisterDto): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await this.usersService.create(dto);

    const tokens = await this.generateStudentTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'student',
    });

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { ...tokens, user };
  }

  async studentLogin(dto: StudentLoginDto): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive()) {
      throw new ForbiddenException('Your account is not active. Please verify your email or contact support.');
    }

    const isPasswordValid = await PasswordUtil.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateStudentTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'student',
    });

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    await this.usersService.updateLastLogin(user.id);

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { ...tokens, user };
  }

  async studentRefresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: StudentJwtPayload;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('jwt.student.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'student') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isValid = await this.usersService.verifyRefreshToken(payload.sub, dto.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const tokens = await this.generateStudentTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'student',
    });

    await this.usersService.updateRefreshToken(payload.sub, tokens.refreshToken);

    return tokens;
  }

  async studentLogout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async getStudentProfile(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }

  async adminRegister(dto: AdminRegisterDto, createdByAdminId?: string): Promise<{ accessToken: string; refreshToken: string; admin: Admin }> {
    if (createdByAdminId) {
      const creator = await this.adminsService.findOne(createdByAdminId);
      if (!creator.isSuperAdmin()) {
        throw new ForbiddenException('Only Super Admin can create new admin accounts');
      }
    } else {
      const adminCount = await this.adminsService.countAll();
      if (adminCount > 0) {
        throw new ForbiddenException('Admin registration is restricted. Contact Super Admin.');
      }
      dto.role = AdminRole.SUPER_ADMIN;
    }

    const admin = await this.adminsService.create(dto, createdByAdminId);

    const tokens = await this.generateAdminTokens({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    });

    await this.adminsService.updateRefreshToken(admin.id, tokens.refreshToken);

    delete (admin as any).password;
    delete (admin as any).refreshTokenHash;

    return { ...tokens, admin };
  }

  async adminLogin(dto: AdminLoginDto, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string; admin: Admin }> {
    const admin = await this.adminsService.findByEmailWithPassword(dto.email);
    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive()) {
      throw new ForbiddenException('Your admin account is suspended. Contact Super Admin.');
    }

    const isPasswordValid = await PasswordUtil.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateAdminTokens({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    });

    await this.adminsService.updateRefreshToken(admin.id, tokens.refreshToken);
    await this.adminsService.updateLastLogin(admin.id, ipAddress);

    delete (admin as any).password;
    delete (admin as any).refreshTokenHash;
    delete (admin as any).twoFactorSecret;

    return { ...tokens, admin };
  }

  async adminRefresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: AdminJwtPayload;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('jwt.admin.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isValid = await this.adminsService.verifyRefreshToken(payload.sub, dto.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const tokens = await this.generateAdminTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'admin',
    });

    await this.adminsService.updateRefreshToken(payload.sub, tokens.refreshToken);

    return tokens;
  }

  async adminLogout(adminId: string): Promise<void> {
    await this.adminsService.updateRefreshToken(adminId, null);
  }

  async getAdminProfile(adminId: string): Promise<Admin> {
    return this.adminsService.findOne(adminId);
  }

  private async generateStudentTokens(payload: StudentJwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.student.secret'),
      expiresIn: this.configService.get('jwt.student.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.student.refreshSecret'),
      expiresIn: this.configService.get('jwt.student.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }

  private async generateAdminTokens(payload: AdminJwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.admin.secret'),
      expiresIn: this.configService.get('jwt.admin.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.admin.refreshSecret'),
      expiresIn: this.configService.get('jwt.admin.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }
}