import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage, EmailProvider } from './email.provider';

@Injectable()
export class ResendEmailProvider extends EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(configService: ConfigService) {
    super();
    this.apiKey = configService.getOrThrow<string>('RESEND_API_KEY');
    this.from = configService.get<string>('EMAIL_FROM', 'B28 Oncodex <noreply@b28.dev>');
  }

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend API error (${res.status}): ${body}`);
      throw new Error('Failed to send email.');
    }
  }
}
