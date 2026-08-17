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

    const user = await this.usersService.findOne(payload.sub);

    if (!user.isActive()) {
      throw new UnauthorizedException(
        'Your account has been suspended or deactivated',
      );
    }

    return user;
  }
}
