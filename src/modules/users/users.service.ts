import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { User, UserDocument, UserSession } from './entities/user.entity';
import { PasswordUtil } from '@common/utils/password.util';
import { UserStatus } from '@shared/enums/role.enum';
import {
  CreateUserDto,
  UpdatePasswordDto,
  UpdateUserDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    if (createUserDto.phone) {
      const phoneExists = await this.userModel.findOne({
        phone: createUserDto.phone,
        deletedAt: null,
      });
      if (phoneExists) {
        throw new ConflictException('Phone number is already registered');
      }
    }

    const hashedPassword = await PasswordUtil.hash(
      createUserDto.password,
      this.configService.get('app.bcryptRounds'),
    );

    const profileCompletionPercentage = this.calculateProfileCompletion({
      ...createUserDto,
    });

    const savedUser = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      profileCompletionPercentage,
      isProfileComplete: profileCompletionPercentage >= 80,
    });

    return savedUser.toJSON();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const filter = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          'email firstName lastName phone avatar status emailVerified phoneVerified profileCompletionPercentage isProfileComplete createdAt updatedAt',
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ _id: id, deletedAt: null });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, deletedAt: null });
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, deletedAt: null });
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId, deletedAt: null });
  }

  async createGoogleUser(data: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      existingUser.googleId = data.googleId;
      if (data.avatar && !existingUser.avatar) {
        existingUser.avatar = data.avatar;
      }
      existingUser.emailVerified = true;
      if (existingUser.status !== UserStatus.ACTIVE) {
        existingUser.status = UserStatus.ACTIVE;
      }
      const saved = await existingUser.save();
      return saved.toJSON();
    }

    const savedUser = await this.userModel.create({
      googleId: data.googleId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      profileCompletionPercentage: this.calculateProfileCompletion({
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: data.avatar,
      }),
      isProfileComplete: false,
    });

    return savedUser.toJSON();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const phoneExists = await this.userModel.findOne({
        phone: updateUserDto.phone,
        deletedAt: null,
      });
      if (phoneExists) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    Object.assign(user, updateUserDto);
    user.profileCompletionPercentage = this.calculateProfileCompletion(user);
    user.isProfileComplete = user.profileCompletionPercentage >= 80;

    const savedUser = await user.save();
    return savedUser.toJSON();
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.userModel.findById(id);

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await PasswordUtil.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await PasswordUtil.hash(
      updatePasswordDto.newPassword,
      this.configService.get('app.bcryptRounds'),
    );

    await this.userModel.findByIdAndUpdate(id, {
      password: hashedNewPassword,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.userModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const refreshTokenHash = refreshToken ? this.hashToken(refreshToken) : null;

    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash });
  }

  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);

    if (!user || !user.refreshTokenHash) return false;

    return this.hashToken(refreshToken) === user.refreshTokenHash;
  }

  /**
   * Refresh tokens are long-lived secrets, so store a SHA-256 fingerprint
   * instead of bcrypt (bcrypt silently truncates input at 72 bytes, which
   * would make every token for a user hash to the same value).
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLoginAt: new Date(),
    });
  }

  // ═══════════════════════════════════════════════════
  // ║  DEVICE SESSIONS (single active session)        ║
  // ═══════════════════════════════════════════════════

  /** Active (non-expired) sessions for a student. */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const user = await this.userModel.findById(userId).select('activeSessions');

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const now = Date.now();
    return (user.activeSessions ?? []).filter(
      (session) =>
        session.expiresAt && new Date(session.expiresAt).getTime() > now,
    );
  }

  /**
   * Store a new login session. By default any previous session is replaced,
   * which enforces one active device per student account.
   */
  async startSession(
    userId: string,
    session: UserSession,
    keepOtherSessions = false,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).select('activeSessions');

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const now = Date.now();
    const existing = (user.activeSessions ?? []).filter(
      (current) =>
        current.expiresAt && new Date(current.expiresAt).getTime() > now,
    );

    const sessions = keepOtherSessions
      ? [
          ...existing.filter(
            (current) => current.sessionId !== session.sessionId,
          ),
          session,
        ]
      : [session];

    await this.userModel.findByIdAndUpdate(userId, {
      activeSessions: sessions,
    });
  }

  async touchSession(
    userId: string,
    sessionId: string,
    expiresAt?: Date,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      'activeSessions.$.lastActiveAt': new Date(),
    };
    if (expiresAt) {
      update['activeSessions.$.expiresAt'] = expiresAt;
    }

    await this.userModel.updateOne(
      { _id: userId, 'activeSessions.sessionId': sessionId },
      { $set: update },
    );
  }

  /** Revoke one device session. Returns true when a session was removed. */
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    if (!sessionId) return false;

    const result = await this.userModel.updateOne(
      { _id: userId },
      { $pull: { activeSessions: { sessionId } } },
    );

    return (result.modifiedCount ?? 0) > 0;
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { activeSessions: [] });
  }

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    if (!sessionId) return false;

    const count = await this.userModel.countDocuments({
      _id: userId,
      activeSessions: {
        $elemMatch: {
          sessionId,
          expiresAt: { $gt: new Date() },
        },
      },
    });

    return count > 0;
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      status: UserStatus.ACTIVE,
    });
  }

  async verifyPhone(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      phoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
    });
  }

  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { status });
  }

  async getProfileCompletion(userId: string): Promise<{
    percentage: number;
    isComplete: boolean;
    missingFields: string[];
  }> {
    const user = await this.findOne(userId);
    const percentage = this.calculateProfileCompletion(user);
    const missingFields = this.getMissingProfileFields(user);

    return {
      percentage,
      isComplete: percentage >= 80,
      missingFields,
    };
  }

  private calculateProfileCompletion(user: Partial<User>): number {
    const fields = [
      { key: 'firstName', weight: 5 },
      { key: 'lastName', weight: 5 },
      { key: 'phone', weight: 10 },
      { key: 'dateOfBirth', weight: 5 },
      { key: 'gender', weight: 5 },
      { key: 'address', weight: 10 },
      { key: 'city', weight: 5 },
      { key: 'state', weight: 5 },
      { key: 'pincode', weight: 5 },
      { key: 'highestQualification', weight: 10 },
      { key: 'college', weight: 10 },
      { key: 'yearOfPassing', weight: 5 },
      { key: 'currentCompany', weight: 5 },
      { key: 'jobRole', weight: 5 },
      { key: 'experienceYears', weight: 5 },
      { key: 'avatar', weight: 5 },
    ];

    let score = 0;
    let totalWeight = 0;

    for (const field of fields) {
      totalWeight += field.weight;
      const value = user[field.key as keyof User];
      if (value !== null && value !== undefined && value !== '') {
        score += field.weight;
      }
    }

    return Math.round((score / totalWeight) * 100);
  }

  private getMissingProfileFields(user: Partial<User>): string[] {
    const requiredFields = [
      { key: 'phone', label: 'Phone Number' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'PIN Code' },
      { key: 'highestQualification', label: 'Highest Qualification' },
      { key: 'college', label: 'College/University' },
      { key: 'yearOfPassing', label: 'Year of Passing' },
    ];

    return requiredFields
      .filter((field) => {
        const value = user[field.key as keyof User];
        return value === null || value === undefined || value === '';
      })
      .map((field) => field.label);
  }

  async countByStatus(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    suspended: number;
  }> {
    const [total, active, inactive, pending, suspended] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: null }),
      this.userModel.countDocuments({
        status: UserStatus.ACTIVE,
        deletedAt: null,
      }),
      this.userModel.countDocuments({
        status: UserStatus.INACTIVE,
        deletedAt: null,
      }),
      this.userModel.countDocuments({
        status: UserStatus.PENDING,
        deletedAt: null,
      }),
      this.userModel.countDocuments({
        status: UserStatus.SUSPENDED,
        deletedAt: null,
      }),
    ]);

    return { total, active, inactive, pending, suspended };
  }
}
