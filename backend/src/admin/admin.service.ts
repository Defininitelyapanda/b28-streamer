import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../health/redis.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getOverview() {
    let db = false;
    let redis = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }

    redis = await this.redis.ping();

    const [totalUsers, roleCounts, settings] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.userRole.groupBy({
        by: ['roleId'],
        _count: { roleId: true },
      }),
      this.prisma.platformSetting.findMany({
        where: {
          key: {
            in: [
              'subscription.monthly_price',
              'subscription.annual_price',
              'subscription.currency',
              'revenue.filmmaker_percentage',
              'revenue.platform_percentage',
            ],
          },
        },
      }),
    ]);

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleCounts.map((r) => r.roleId) } },
    });

    const byRole: Record<string, number> = {};
    for (const rc of roleCounts) {
      const role = roles.find((r) => r.id === rc.roleId);
      if (role) byRole[role.name] = rc._count.roleId;
    }

    const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    return {
      health: {
        status: db && (redis || process.env.NODE_ENV !== 'production') ? 'ready' : 'not_ready',
        checks: { database: db, redis },
      },
      users: { total: totalUsers, byRole },
      settings: {
        monthlyPrice: Number(settingMap['subscription.monthly_price'] ?? 400),
        annualPrice: Number(settingMap['subscription.annual_price'] ?? 4320),
        filmmakerShare: Number(settingMap['revenue.filmmaker_percentage'] ?? 70),
        platformShare: Number(settingMap['revenue.platform_percentage'] ?? 30),
        currency: String(settingMap['subscription.currency'] ?? 'KES'),
      },
    };
  }
}
