import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { AdminCatalogController, CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { YoutubeSyncService } from './youtube-sync.service';

@Module({
  imports: [StorageModule, SubscriptionsModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService, YoutubeSyncService, SubscriptionGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
