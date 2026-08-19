import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;
  const prisma = {
    platformSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    featureFlag: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    service = new SettingsService(prisma);
    jest.clearAllMocks();
  });

  it('rejects revenue split that does not sum to 100', async () => {
    (prisma.platformSetting.findUnique as jest.Mock)
      .mockResolvedValueOnce({ key: 'revenue.filmmaker_percentage', value: 70 })
      .mockResolvedValueOnce({ key: 'revenue.platform_percentage', value: 20 });

    await expect(service.validateRevenueSplit()).rejects.toThrow(BadRequestException);
  });

  it('accepts revenue split that sums to 100', async () => {
    (prisma.platformSetting.findUnique as jest.Mock)
      .mockResolvedValueOnce({ key: 'revenue.filmmaker_percentage', value: 70 })
      .mockResolvedValueOnce({ key: 'revenue.platform_percentage', value: 30 });

    await expect(service.validateRevenueSplit()).resolves.toBeUndefined();
  });

  it('rejects platform_percentage outside 0-100', async () => {
    await expect(
      service.upsertSetting({ key: 'revenue.platform_percentage', value: 150, type: 'number' }),
    ).rejects.toThrow(BadRequestException);
  });
});
