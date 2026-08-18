import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFeatureFlagDto, UpsertSettingDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async listSettings() {
    return this.prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async getSetting(key: string) {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException({ code: 'SETTING_NOT_FOUND', message: 'Setting not found.' });
    }
    return setting;
  }

  async upsertSetting(dto: UpsertSettingDto, updatedBy?: string) {
    this.validateSetting(dto.key, dto.value);

    const before = await this.prisma.platformSetting.findUnique({ where: { key: dto.key } });

    const setting = await this.prisma.platformSetting.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value as Prisma.InputJsonValue,
        type: dto.type,
        updatedBy,
      },
      update: {
        value: dto.value as Prisma.InputJsonValue,
        type: dto.type,
        updatedBy,
      },
    });

    return { before, after: setting };
  }

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async listPublicFeatureFlags() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { enabled: true },
      select: { key: true },
    });
    return flags.map((f) => f.key);
  }

  async updateFeatureFlag(key: string, dto: UpdateFeatureFlagDto) {
    const before = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!before) {
      throw new NotFoundException({ code: 'FEATURE_FLAG_NOT_FOUND', message: 'Feature flag not found.' });
    }

    const after = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        enabled: dto.enabled,
        description: dto.description ?? before.description,
      },
    });

    return { before, after };
  }

  private validateSetting(key: string, value: unknown) {
    if (key === 'revenue.filmmaker_percentage' || key === 'revenue.platform_percentage') {
      const filmmaker = key === 'revenue.filmmaker_percentage'
        ? Number(value)
        : undefined;
      // Validate on paired update handled in controller batch or individually
      if (filmmaker !== undefined && (filmmaker < 0 || filmmaker > 100)) {
        throw new BadRequestException({ code: 'INVALID_SETTING', message: 'Percentage must be 0-100.' });
      }
    }

    if (key === 'revenue.split') {
      const split = value as { filmmaker: number; platform: number };
      if (split.filmmaker + split.platform !== 100) {
        throw new BadRequestException({
          code: 'INVALID_REVENUE_SPLIT',
          message: 'Filmmaker and platform percentages must sum to 100.',
        });
      }
    }
  }

  async validateRevenueSplit() {
    const filmmaker = await this.prisma.platformSetting.findUnique({
      where: { key: 'revenue.filmmaker_percentage' },
    });
    const platform = await this.prisma.platformSetting.findUnique({
      where: { key: 'revenue.platform_percentage' },
    });

    if (filmmaker && platform) {
      const f = Number(filmmaker.value);
      const p = Number(platform.value);
      if (f + p !== 100) {
        throw new BadRequestException({
          code: 'INVALID_REVENUE_SPLIT',
          message: 'Filmmaker and platform percentages must sum to 100.',
        });
      }
    }
  }
}
