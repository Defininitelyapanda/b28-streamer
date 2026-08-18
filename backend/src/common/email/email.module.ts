import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailProvider } from './console-email.provider';
import { EMAIL_PROVIDER } from './email.provider';
import { EmailService } from './email.service';
import { ResendEmailProvider } from './resend-email.provider';

@Module({
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService) => {
        if (config.get<string>('RESEND_API_KEY')) {
          return new ResendEmailProvider(config);
        }
        return new ConsoleEmailProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
