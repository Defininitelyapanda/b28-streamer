import { Global, Module } from '@nestjs/common';
import { HealthModule } from '../../health/health.module';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [HealthModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
