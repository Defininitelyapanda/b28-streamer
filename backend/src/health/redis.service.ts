import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private configService: ConfigService) {}

  getClient(): Redis {
    if (!this.client) {
      const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    }
    return this.client;
  }

  async ping(): Promise<boolean> {
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
