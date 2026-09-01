import { registerAs } from '@nestjs/config';

export default registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'https://api.techng.in/api/v1/auth/student/google/callback',
  frontendUrl: process.env.FRONTEND_URL || 'https://lms.techng.in',
}));
