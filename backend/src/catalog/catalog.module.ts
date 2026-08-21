import { Module } from '@nestjs/common';
import { CacheModule } from '../common/cache/cache.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { AdminCatalogController, CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [CacheModule, StorageModule, SubscriptionsModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService, SubscriptionGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
