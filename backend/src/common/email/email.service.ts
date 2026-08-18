import { Injectable, Inject } from '@nestjs/common';
import { EmailMessage, EmailProvider, EMAIL_PROVIDER } from './email.provider';

@Injectable()
export class EmailService {
  constructor(@Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const message: EmailMessage = {
      to: email,
      subject: 'Verify your B28 Oncodex account',
      text: `Use this token to verify your email: ${token}`,
    };
    await this.provider.send(message);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const message: EmailMessage = {
      to: email,
      subject: 'Reset your B28 Oncodex password',
      text: `Use this token to reset your password: ${token}`,
    };
    await this.provider.send(message);
  }
}
