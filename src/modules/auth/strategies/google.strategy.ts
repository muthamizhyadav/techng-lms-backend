import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId'),
      clientSecret: configService.get<string>('google.clientSecret'),
      callbackURL: configService.get<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, name, photos, displayName } = profile;
    const email = emails?.[0]?.value || '';
    const givenName = name?.givenName?.trim();
    const familyName = name?.familyName?.trim();
    const fallbackName = displayName?.trim() || email.split('@')[0] || 'Student';

    const firstName = givenName || fallbackName.split(' ')[0] || 'Student';
    const lastName =
      familyName ||
      (fallbackName.split(' ').length > 1
        ? fallbackName.split(' ').slice(1).join(' ')
        : '');
    const avatar =
      photos?.[0]?.value ||
      profile._json?.picture ||
      profile._json?.avatar_url ||
      null;

    const user = {
      googleId: id,
      email,
      firstName,
      lastName,
      avatar,
    };
    done(null, user);
  }
}
