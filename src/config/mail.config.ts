import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  // GoDaddy Workspace Email SMTP. Port 465 uses implicit TLS; use 587 with
  // MAIL_SECURE=false when the account requires STARTTLS instead.
  host: process.env.MAIL_HOST || 'smtpout.secureserver.net',
  port: parseInt(process.env.MAIL_PORT, 10) || 465,
  secure: (process.env.MAIL_SECURE ?? 'true').toLowerCase() !== 'false',
  user: process.env.MAIL_USER || 'connect@techng.in',
  password: process.env.MAIL_PASSWORD,
  fromName: process.env.MAIL_FROM_NAME || 'TechNG LMS',
  fromAddress:
    process.env.MAIL_FROM_ADDRESS ||
    process.env.MAIL_USER ||
    'connect@techng.in',
  // Origin used to build the password-reset link.
  adminPanelUrl:
    process.env.ADMIN_PANEL_URL ||
    process.env.FRONTEND_URL ||
    'https://lms.techng.in',
  // Origin of the student app, used to build the student reset link.
  studentPanelUrl:
    process.env.STUDENT_PANEL_URL ||
    process.env.FRONTEND_URL ||
    'https://lms.techng.in',
  resetTokenTtlMinutes: parseInt(process.env.MAIL_RESET_TTL_MINUTES, 10) || 60,
}));
