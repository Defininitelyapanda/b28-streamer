import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private configService: ConfigService) {}

  private getRedisUrl(): string | undefined {
    return this.configService.get<string>('REDIS_URL');
  }

  getClient(): Redis {
    const url = this.getRedisUrl();
    if (!url) {
      throw new Error('REDIS_URL is not configured');
    }
    if (!this.client) {
      this.client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    }
    return this.client;
  }

  async ping(): Promise<boolean> {
    if (!this.getRedisUrl()) {
      return false;
    }
    try {
      const client = this.getClient();
      if (client.status !== 'ready') {
        await client.connect();
      }
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
