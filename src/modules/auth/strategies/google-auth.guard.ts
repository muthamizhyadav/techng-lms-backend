import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from '../auth.service';

export const OAUTH_NONCE_COOKIE = 'techng_oauth_nonce';

/**
 * Starts the Google OAuth flow with a signed `state` value that carries the
 * device identity of the browser that initiated the sign-in. A matching
 * HttpOnly nonce cookie blocks login CSRF. The callback can then apply the
 * same single-device approval rule as password sign-in.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse<Response>();

    const pick = (value: unknown): string | undefined => {
      if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : undefined;
      }
      return typeof value === 'string' ? value : undefined;
    };

    const forwardedProto = req.headers['x-forwarded-proto'];
    const isHttps =
      req.secure ||
      forwardedProto === 'https' ||
      (Array.isArray(forwardedProto) && forwardedProto[0] === 'https');

    const nonce = randomBytes(24).toString('hex');
    res.cookie(OAUTH_NONCE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge: 10 * 60 * 1000,
      path: '/',
    });

    const state = this.authService.createGoogleOAuthState(
      {
        deviceId: pick(req.query?.deviceId),
        deviceName: pick(req.query?.deviceName),
        platform: pick(req.query?.platform),
      },
      nonce,
    );

    return { state };
  }
}
