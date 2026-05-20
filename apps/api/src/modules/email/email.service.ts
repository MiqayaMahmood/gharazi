import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, resetUrl: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
      const from = this.config.get<string>('EMAIL_FROM') ?? 'Gharazi <no-reply@gharazi.pk>';
    if (!apiKey) {
      this.logger.log(`Password reset email for ${email}: ${resetUrl}`);
      return { queued: false, mode: 'development' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Reset your Gharazi password',
        html: `<p>Use this secure link to reset your Gharazi password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in one hour.</p>`,
      }),
    });

    if (!response.ok) {
      this.logger.warn(`Resend password reset failed: ${response.status} ${await response.text()}`);
      return { queued: false, mode: 'resend' };
    }
    return { queued: true, mode: 'resend' };
  }
}
