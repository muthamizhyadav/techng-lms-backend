// src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '@modules/users/users.service';
import { AdminsService } from '@modules/admins/admins.service';
import { PasswordUtil } from '@common/utils/password.util';
import { generateUuid } from '@common/utils/uuid.util';
import {
  StudentJwtPayload,
  AdminJwtPayload,
  DeviceApprovalPayload,
  GoogleOAuthStatePayload,
} from '@shared/interfaces/jwt-payload.interface';
import { User, UserSession } from '@modules/users/entities/user.entity';
import { Admin } from '@modules/admins/entities/admin.entity';
import { AdminRole } from '@shared/enums/user-status.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { AdminNotificationType } from '@modules/notifications/entities/notification.entity';
import { MailService } from '@modules/mail/mail.service';
import {
  ApproveDeviceLoginDto,
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  StudentLoginDto,
  StudentRegisterDto,
} from './dto/auth.dto';
import { AdminLoginDto, AdminRegisterDto } from '../admins/dto/admin.dto';

/** How long a student has to approve signing out their other device. */
const DEVICE_APPROVAL_TTL = '5m';
const DEVICE_APPROVAL_TTL_SECONDS = 5 * 60;

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

/** Device details safe to show in a login-permission prompt. */
export interface DeviceSummary {
  deviceName: string;
  platform: string;
  ipAddress: string;
  loggedInAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

/** Device hint carried through the Google OAuth redirect. */
export interface GoogleDeviceHint {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  /** Set only on verified OAuth state, never supplied by the client. */
  nonce?: string;
}

export interface GoogleLoginConflict {
  approvalToken: string;
  approvalExpiresInSeconds: number;
  activeSessions: DeviceSummary[];
  /**
   * Device id the approval token is bound to. The browser echoes it back when
   * approving, which keeps the flow working even if the OAuth state was lost.
   */
  deviceId: string;
}

export type GoogleLoginResult =
  | {
      status: 'success';
      accessToken: string;
      refreshToken: string;
      user: User;
    }
  | {
      status: 'conflict';
      conflict: GoogleLoginConflict;
    };

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly adminsService: AdminsService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
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

    void this.notifyAdminsOfNewStudent(user);

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
          'Your account is already active on another device. Sign out of that device to continue here.',
        activeSessions: otherDeviceSessions.map((session) =>
          this.toDeviceSummary(session),
        ),
        // Proves the credentials were valid a moment ago, so the student can
        // approve the takeover without typing their password again.
        approvalToken: await this.createDeviceApprovalToken(user, device),
        approvalExpiresInSeconds: DEVICE_APPROVAL_TTL_SECONDS,
      });
    }

    const tokens = await this.createStudentSession(user, device, context);
    await this.usersService.updateLastLogin(user.id);

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { ...tokens, user };
  }

  /**
   * Completes a login that previously hit the single-device conflict. The
   * student explicitly agreed to sign out the other device, so the existing
   * session is replaced by the new one.
   */
  async approveDeviceLogin(
    dto: ApproveDeviceLoginDto,
    context: StudentLoginContext = {},
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    let payload: DeviceApprovalPayload;
    try {
      payload = this.jwtService.verify(dto.approvalToken, {
        secret: this.configService.get('jwt.student.secret'),
      });
    } catch {
      throw new UnauthorizedException(
        'This sign-in approval has expired. Please sign in again.',
      );
    }

    if (payload.type !== 'device-approval') {
      throw new UnauthorizedException('Invalid approval token');
    }

    const device = this.resolveDevice(dto, context);
    if (payload.did && payload.did !== device.deviceId) {
      throw new UnauthorizedException(
        'This approval was requested from a different device. Please sign in again.',
      );
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user.isActive()) {
      throw new ForbiddenException(
        'Your account is not active. Please verify your email or contact support.',
      );
    }

    // Replacing the session list is what actually signs the other device out.
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
    deviceHint: GoogleDeviceHint = {},
  ): Promise<GoogleLoginResult> {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(
        profile.email,
      );
      user = (await this.usersService.createGoogleUser(profile)) as any;

      if (!existingByEmail) {
        void this.notifyAdminsOfNewStudent(user);
      }
    }

    const device = this.resolveDevice(deviceHint, context);
    const activeSessions = await this.usersService.getActiveSessions(user.id);
    const otherDeviceSessions = activeSessions.filter(
      (session) => session.deviceId !== device.deviceId,
    );

    // Google sign-in follows exactly the same single-device rule as password
    // sign-in: the student must approve signing the other device out.
    if (otherDeviceSessions.length > 0) {
      return {
        status: 'conflict',
        conflict: {
          approvalToken: await this.createDeviceApprovalToken(user, device),
          approvalExpiresInSeconds: DEVICE_APPROVAL_TTL_SECONDS,
          activeSessions: otherDeviceSessions.map((session) =>
            this.toDeviceSummary(session),
          ),
          deviceId: device.deviceId,
        },
      };
    }

    const tokens = await this.createStudentSession(user, device, context);
    await this.usersService.updateLastLogin(user.id);

    delete (user as any).password;
    delete (user as any).refreshTokenHash;

    return { status: 'success', ...tokens, user };
  }

  /** Signs the device hint into the OAuth `state` parameter. */
  createGoogleOAuthState(hint: GoogleDeviceHint, nonce: string): string {
    const payload: GoogleOAuthStatePayload = {
      type: 'oauth-state',
      did: hint.deviceId,
      dn: hint.deviceName,
      pf: hint.platform,
      nonce,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.student.secret'),
      expiresIn: '10m',
    });
  }

  /** Verifies the OAuth `state` and returns the device hint it carries. */
  verifyGoogleOAuthState(state?: string): GoogleDeviceHint | null {
    if (!state) return null;

    try {
      const payload = this.jwtService.verify<GoogleOAuthStatePayload>(state, {
        secret: this.configService.get('jwt.student.secret'),
      });

      if (payload.type !== 'oauth-state') return null;

      return {
        deviceId: payload.did,
        deviceName: payload.dn,
        platform: payload.pf,
        nonce: payload.nonce,
      };
    } catch {
      return null;
    }
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

  /**
   * Sends a single-use password-reset link to the admin's email. The response
   * is intentionally generic so the endpoint cannot be used to enumerate
   * registered admin accounts.
   */
  async adminForgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const message =
      'If an account with that email exists, a password reset link has been sent.';

    const admin = await this.adminsService.findByEmail(dto.email);
    if (!admin) {
      return { message };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes =
      this.configService.get<number>('mail.resetTokenTtlMinutes') ?? 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.adminsService.setPasswordResetToken(
      admin.id,
      tokenHash,
      expiresAt,
    );

    const baseUrl = (
      this.configService.get<string>('mail.adminPanelUrl') ?? ''
    ).replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/update-password?token=${rawToken}`;

    await this.mailService.sendPasswordResetEmail({
      to: admin.email,
      firstName: admin.firstName,
      resetUrl,
      expiresInMinutes: ttlMinutes,
    });

    return { message };
  }

  /** Consumes a reset token, stores the new password hash and revokes sessions. */
  async adminResetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const admin = await this.adminsService.findByPasswordResetToken(tokenHash);

    if (!admin) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired.',
      );
    }

    const hashedPassword = await PasswordUtil.hash(
      dto.newPassword,
      this.configService.get('app.bcryptRounds'),
    );

    await this.adminsService.resetPassword(admin.id, hashedPassword);

    return { message: 'Your password has been reset successfully.' };
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
      ipAddress: session.ipAddress,
      loggedInAt: session.loggedInAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
    };
  }

  private async createDeviceApprovalToken(
    user: User,
    device: ResolvedDevice,
  ): Promise<string> {
    const payload: DeviceApprovalPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'device-approval',
      did: device.deviceId,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.student.secret'),
      expiresIn: DEVICE_APPROVAL_TTL,
    });
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

  /** Fire-and-forget admin push so onboarding never fails because of FCM. */
  private async notifyAdminsOfNewStudent(user: User): Promise<void> {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    await this.notificationsService.notifyAdmins({
      title: 'New student onboarded',
      body: `${name} just created an account (${user.email}).`,
      type: AdminNotificationType.STUDENT_REGISTERED,
      data: {
        type: 'student_registered',
        userId: user.id,
      },
      link: '/students',
    });
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
