export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
