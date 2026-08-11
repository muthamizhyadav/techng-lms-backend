import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminsService } from '@modules/admins/admins.service';
import { AdminJwtPayload } from '@shared/interfaces/jwt-payload.interface';
import { Admin } from '@modules/admins/entities/admin.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminsService: AdminsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.admin.secret'),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<Admin> {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type for admin access');
    }

    const admin = await this.adminsService.findOne(payload.sub);

    if (!admin.isActive()) {
      throw new UnauthorizedException('Your admin account has been suspended');
    }

    return admin;
  }
}