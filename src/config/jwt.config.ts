import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  student: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  admin: {
    secret: process.env.ADMIN_JWT_SECRET,
    expiresIn: process.env.ADMIN_JWT_EXPIRATION || '15m',
    refreshSecret: process.env.ADMIN_JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.ADMIN_JWT_REFRESH_EXPIRATION || '7d',
  },
}));
