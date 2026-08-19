import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../health/redis.service';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private memoryCleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.memoryCleanupTimer = setInterval(() => this.evictExpiredMemory(), 60_000);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.readRaw(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const payload = JSON.stringify(value);
    const ttl = Math.max(1, ttlSeconds);
    const useRedis = this.hasRedis();

    if (useRedis) {
      try {
        const client = this.redisService.getClient();
        if (client.status !== 'ready') {
          await client.connect();
        }
        await client.setex(key, ttl, payload);
        return;
      } catch {
        this.logger.warn(`Redis set failed for ${key}, using memory fallback`);
      }
    }

    this.memory.set(key, { value: payload, expiresAt: Date.now() + ttl * 1000 });
  }

  async del(key: string): Promise<void> {
    if (this.hasRedis()) {
      try {
        const client = this.redisService.getClient();
        if (client.status !== 'ready') {
          await client.connect();
        }
        await client.del(key);
      } catch {
        // fall through to memory
      }
    }
    this.memory.delete(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (this.hasRedis()) {
      try {
        const client = this.redisService.getClient();
        if (client.status !== 'ready') {
          await client.connect();
        }
        let cursor = '0';
        do {
          const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
          cursor = next;
          if (keys.length) {
            await client.del(...keys);
          }
        } while (cursor !== '0');
      } catch {
        this.logger.warn(`Redis invalidate failed for ${prefix}*, using memory fallback`);
      }
    }

    for (const key of [...this.memory.keys()]) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    }
  }

  async invalidateCatalog(): Promise<void> {
    await this.invalidatePrefix('catalog:');
  }

  async onModuleDestroy() {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
    }
  }

  private hasRedis(): boolean {
    return Boolean(this.configService.get<string>('REDIS_URL'));
  }

  private async readRaw(key: string): Promise<string | null> {
    if (this.hasRedis()) {
      try {
        const client = this.redisService.getClient();
        if (client.status !== 'ready') {
          await client.connect();
        }
        const value = await client.get(key);
        if (value) return value;
      } catch {
        // fall through to memory
      }
    }

    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  private evictExpiredMemory() {
    const now = Date.now();
    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt <= now) {
        this.memory.delete(key);
      }
    }
  }
}
