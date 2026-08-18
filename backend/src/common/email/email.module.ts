import { Module } from '@nestjs/common';
import { ConsoleEmailProvider } from './console-email.provider';
import { EMAIL_PROVIDER } from './email.provider';
import { EmailService } from './email.service';

@Module({
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useClass: ConsoleEmailProvider,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
