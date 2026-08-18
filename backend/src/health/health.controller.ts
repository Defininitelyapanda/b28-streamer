import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get('health')
  liveness() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  async readiness() {
    let db = false;
    let redis = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }

    redis = await this.redis.ping();

    const isDev = process.env.NODE_ENV !== 'production';
    const ready = db && (redis || isDev);

    return {
      status: ready ? 'ready' : 'not_ready',
      checks: { database: db, redis },
    };
  }
}
