import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CacheModule } from '../common/cache/cache.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [SettingsModule, CacheModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
