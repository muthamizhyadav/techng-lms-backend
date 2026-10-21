// src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { UsersService } from '@modules/users/users.service';
import { AdminsService } from '@modules/admins/admins.service';
import { PasswordUtil } from '@common/utils/password.util';
import { generateUuid } from '@common/utils/uuid.util';
import {
  StudentJwtPayload,
  AdminJwtPayload,
} from '@shared/interfaces/jwt-payload.interface';
import { User, UserSession } from '@modules/users/entities/user.entity';
import { Admin } from '@modules/admins/entities/admin.entity';
import { AdminRole } from '@shared/enums/user-status.enum';
import {
  RefreshTokenDto,
  StudentLoginDto,
  StudentRegisterDto,
} from './dto/auth.dto';
import { AdminLoginDto, AdminRegisterDto } from '../admins/dto/admin.dto';

/** Request metadata used to describe the device a student logs in from. */
export interface StudentLoginContext {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

interface ResolvedDevice {
  deviceId: string;
  deviceName: string;
  platform: string;
}

export interface StudentSessionResponse {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  ipAddress: string;
  loggedInAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly adminsService: AdminsService,
  ) {}

  async studentRegister(
    dto: StudentRegisterDto,
    context: StudentLoginContext = {},
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await this.usersService.create(dto);

    const tokens = await this.createStudentSession(
      user,
      this.resolveDevice(dto, context),
      context,
    );

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { ...tokens, user };
  }

  async studentLogin(
    dto: StudentLoginDto,
    context: StudentLoginContext = {},
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive()) {
      throw new ForbiddenException(
        'Your account is not active. Please verify your email or contact support.',
      );
    }

    const isPasswordValid = await PasswordUtil.compare(
      dto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const device = this.resolveDevice(dto, context);
    const activeSessions = await this.usersService.getActiveSessions(user.id);
    const otherDeviceSessions = activeSessions.filter(
      (session) => session.deviceId !== device.deviceId,
    );

    if (otherDeviceSessions.length > 0 && !dto.logoutOtherDevices) {
      throw new ConflictException({
        error: 'Conflict',
        code: 'ALREADY_LOGGED_IN',
        message:
          'You are already logged in on another device. Please log out from that device before logging in again.',
        activeSessions: otherDeviceSessions.map((session) =>
          this.toDeviceSummary(session),
        ),
      });
    }

    const tokens = await this.createStudentSession(user, device, context);
    await this.usersService.updateLastLogin(user.id);

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { ...tokens, user };
  }

  async studentRefresh(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    if (!payload.sid) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const sessionActive = await this.usersService.isSessionActive(
      payload.sub,
      payload.sid,
    );
    if (!sessionActive) {
      await this.usersService.updateRefreshToken(payload.sub, null);
      throw new UnauthorizedException(
        'Your session has ended. Please log in again.',
      );
    }

    const isValid = await this.usersService.verifyRefreshToken(
      payload.sub,
      dto.refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const tokens = await this.generateStudentTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'student',
      sid: payload.sid,
    });

    await this.usersService.updateRefreshToken(
      payload.sub,
      tokens.refreshToken,
    );
    await this.usersService.touchSession(
      payload.sub,
      payload.sid,
      this.resolveRefreshExpiry(),
    );

    return tokens;
  }

  async studentLogout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.usersService.revokeSession(userId, sessionId);
    } else {
      await this.usersService.revokeAllSessions(userId);
    }

    const remainingSessions = await this.usersService.getActiveSessions(userId);
    if (remainingSessions.length === 0) {
      await this.usersService.updateRefreshToken(userId, null);
    }
  }

  async getStudentSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<StudentSessionResponse[]> {
    const sessions = await this.usersService.getActiveSessions(userId);
    return sessions.map((session) =>
      this.toSessionResponse(session, currentSessionId),
    );
  }

  async revokeStudentSession(
    userId: string,
    sessionId: string,
    currentSessionId?: string,
  ): Promise<{
    message: string;
    sessionId: string;
    wasCurrentSession: boolean;
  }> {
    const revoked = await this.usersService.revokeSession(userId, sessionId);
    if (!revoked) {
      throw new NotFoundException('Session not found or already logged out');
    }

    const remainingSessions = await this.usersService.getActiveSessions(userId);
    if (remainingSessions.length === 0) {
      await this.usersService.updateRefreshToken(userId, null);
    }

    return {
      message: 'Device logged out successfully',
      sessionId,
      wasCurrentSession: sessionId === currentSessionId,
    };
  }

  async studentLogoutAll(userId: string): Promise<{ message: string }> {
    await this.studentLogout(userId);
    return { message: 'Logged out from all devices successfully' };
  }

  async getStudentProfile(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }

  async googleLogin(
    profile: {
      googleId: string;
      email: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    },
    context: StudentLoginContext = {},
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      user = (await this.usersService.createGoogleUser(profile)) as any;
    }

    // Google sign-in is a trusted redirect flow, so it takes over the single
    // active session instead of asking for confirmation.
    const tokens = await this.createStudentSession(
      user,
      this.resolveDevice({}, context),
      context,
    );
    await this.usersService.updateLastLogin(user.id);

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { ...tokens, user };
  }

  async adminRegister(
    dto: AdminRegisterDto,
    createdByAdminId?: string,
  ): Promise<{ accessToken: string; refreshToken: string; admin: Admin }> {
    if (createdByAdminId) {
      const creator = await this.adminsService.findOne(createdByAdminId);
      if (!creator.isSuperAdmin()) {
        throw new ForbiddenException(
          'Only Super Admin can create new admin accounts',
        );
      }
    } else {
      const adminCount = await this.adminsService.countAll();
      if (adminCount > 0) {
        throw new ForbiddenException(
          'Admin registration is restricted. Contact Super Admin.',
        );
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

  async adminLogin(
    dto: AdminLoginDto,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; admin: Admin }> {
    const admin = await this.adminsService.findByEmailWithPassword(dto.email);
    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive()) {
      throw new ForbiddenException(
        'Your admin account is suspended. Contact Super Admin.',
      );
    }

    const isPasswordValid = await PasswordUtil.compare(
      dto.password,
      admin.password,
    );
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

  async adminRefresh(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    const isValid = await this.adminsService.verifyRefreshToken(
      payload.sub,
      dto.refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const tokens = await this.generateAdminTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'admin',
    });

    await this.adminsService.updateRefreshToken(
      payload.sub,
      tokens.refreshToken,
    );

    return tokens;
  }

  async adminLogout(adminId: string): Promise<void> {
    await this.adminsService.updateRefreshToken(adminId, null);
  }

  async getAdminProfile(adminId: string): Promise<Admin> {
    return this.adminsService.findOne(adminId);
  }

  // ═══════════════════════════════════════════════════
  // ║  DEVICE SESSION HELPERS                         ║
  // ═══════════════════════════════════════════════════

  private async createStudentSession(
    user: User,
    device: ResolvedDevice,
    context: StudentLoginContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = generateUuid();
    const tokens = await this.generateStudentTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'student',
      sid: sessionId,
    });

    await this.usersService.startSession(user.id, {
      sessionId,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      platform: device.platform,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      loggedInAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: this.resolveRefreshExpiry(),
    });
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private resolveDevice(
    dto: {
      deviceId?: string;
      deviceName?: string;
      platform?: string;
    },
    context: StudentLoginContext,
  ): ResolvedDevice {
    const userAgent = context.userAgent || '';

    // When the client does not send a stable device id, fall back to a
    // user-agent fingerprint so re-login from the same browser is allowed.
    const deviceId =
      (dto.deviceId || context.deviceId || '').trim() ||
      `ua:${createHash('sha256')
        .update(userAgent || 'unknown-device')
        .digest('hex')
        .slice(0, 40)}`;

    return {
      deviceId,
      deviceName: dto.deviceName?.trim() || this.describeDevice(userAgent),
      platform: dto.platform || this.detectPlatform(userAgent),
    };
  }

  private toDeviceSummary(session: UserSession) {
    return {
      deviceName: session.deviceName,
      platform: session.platform,
      loggedInAt: session.loggedInAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
    };
  }

  private toSessionResponse(
    session: UserSession,
    currentSessionId?: string,
  ): StudentSessionResponse {
    return {
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      platform: session.platform,
      ipAddress: session.ipAddress,
      loggedInAt: session.loggedInAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      isCurrent: !!currentSessionId && session.sessionId === currentSessionId,
    };
  }

  private resolveRefreshExpiry(): Date {
    const raw =
      this.configService.get<string>('jwt.student.refreshExpiresIn') || '7d';
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    const match = /^(\d+)\s*([smhd])$/i.exec(raw.trim());
    const durationMs = match
      ? Number(match[1]) * unitMs[match[2].toLowerCase()]
      : 7 * unitMs.d;

    return new Date(Date.now() + durationMs);
  }

  private describeDevice(userAgent: string): string {
    const browser = /Edg\//.test(userAgent)
      ? 'Edge'
      : /OPR\//.test(userAgent)
        ? 'Opera'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Firefox\//.test(userAgent)
            ? 'Firefox'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : 'Unknown browser';

    const os = /Windows/.test(userAgent)
      ? 'Windows'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad|iPod/.test(userAgent)
          ? 'iOS'
          : /Mac OS X/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'Unknown OS';

    return `${browser} on ${os}`;
  }

  private detectPlatform(userAgent: string): string {
    if (/Android/i.test(userAgent)) return 'android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Windows|Mac OS X|Linux/i.test(userAgent)) return 'web';
    return 'unknown';
  }

  private async generateStudentTokens(
    payload: StudentJwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

  private async generateAdminTokens(
    payload: AdminJwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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
