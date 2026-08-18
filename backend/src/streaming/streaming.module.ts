import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';

@Module({
  imports: [CatalogModule, SubscriptionsModule, StorageModule],
  controllers: [StreamingController],
  providers: [StreamingService, SubscriptionGuard],
  exports: [StreamingService],
})
export class StreamingModule {}
