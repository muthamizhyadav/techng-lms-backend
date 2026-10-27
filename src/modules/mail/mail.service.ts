import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetEmailOptions {
  to: string;
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const secure = this.configService.get<boolean>('mail.secure');
    const user = this.configService.get<string>('mail.user');
    const password = this.configService.get<string>('mail.password');

    if (!host || !user || !password) {
      this.logger.warn(
        'SMTP is not configured (MAIL_HOST, MAIL_USER, MAIL_PASSWORD). Outgoing email is disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });

    // Verify asynchronously so a slow/unreachable SMTP host never blocks boot.
    void this.transporter
      .verify()
      .then(() => {
        this.logger.log(`SMTP connection verified (${host}:${port}).`);
      })
      .catch((error: Error) => {
        this.logger.warn(
          `SMTP verification failed for ${host}:${port}: ${error.message}`,
        );
      });
  }

  get isEnabled(): boolean {
    return this.transporter !== null;
  }

  async sendMail(options: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipping "${options.subject}" email to ${options.to}: SMTP is not configured.`,
      );
      return false;
    }

    const fromName = this.configService.get<string>('mail.fromName');
    const fromAddress = this.configService.get<string>('mail.fromAddress');

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email "${options.subject}" sent to ${options.to}.`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send "${options.subject}" email to ${options.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async sendPasswordResetEmail(
    options: PasswordResetEmailOptions,
  ): Promise<boolean> {
    const name = this.escapeHtml(options.firstName || 'there');

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;">
                <div style="font-size:20px;font-weight:800;letter-spacing:-0.3px;">
                  Tech<span style="color:#0082C8;">NG</span> LMS
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Reset your password</h1>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">Hi ${name},</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
                  We received a request to reset the password for your TechNG LMS account.
                  Click the button below to choose a new password.
                </p>
                <p style="margin:0 0 24px;text-align:center;">
                  <a href="${options.resetUrl}" style="display:inline-block;background:#0082C8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;">
                    Reset Password
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#64748b;">
                  This link expires in ${options.expiresInMinutes} minutes and can only be used once.
                </p>
                <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#64748b;">
                  If you did not request a password reset, you can safely ignore this email.
                  Your password will not change.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  ${options.resetUrl}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
                TechNG LMS &middot; This is an automated message, please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const text = [
      `Hi ${options.firstName || 'there'},`,
      '',
      'We received a request to reset the password for your TechNG LMS account.',
      `Reset your password: ${options.resetUrl}`,
      '',
      `This link expires in ${options.expiresInMinutes} minutes and can only be used once.`,
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n');

    return this.sendMail({
      to: options.to,
      subject: 'Reset your TechNG LMS password',
      html,
      text,
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
