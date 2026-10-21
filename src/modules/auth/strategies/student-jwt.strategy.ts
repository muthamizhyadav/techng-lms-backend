import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@modules/users/users.service';
import { StudentJwtPayload } from '@shared/interfaces/jwt-payload.interface';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class StudentJwtStrategy extends PassportStrategy(
  Strategy,
  'student-jwt',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.student.secret'),
    });
  }

  async validate(payload: StudentJwtPayload): Promise<User> {
    if (payload.type !== 'student') {
      throw new UnauthorizedException('Invalid token type for student access');
    }

    if (!payload.sid) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const user = await this.usersService.findOne(payload.sub);

    if (!user.isActive()) {
      throw new UnauthorizedException(
        'Your account has been suspended or deactivated',
      );
    }

    const now = Date.now();
    const session = (user.activeSessions ?? []).find(
      (current) =>
        current.sessionId === payload.sid &&
        current.expiresAt &&
        new Date(current.expiresAt).getTime() > now,
    );

    if (!session) {
      throw new UnauthorizedException(
        'Your session has ended. Please log in again.',
      );
    }

    // Expose the current session id to controllers so logout can revoke the
    // exact device that made the request.
    (user as User & { currentSessionId?: string }).currentSessionId =
      payload.sid;

    return user;
  }
}
