import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  const settingsService = {
    isFeatureEnabled: jest.fn(),
    isPaymentsGatewayEnabled: jest.fn(),
  } as unknown as SettingsService;
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  } as unknown as CacheService;
  const prisma = {
    userSubscription: { upsert: jest.fn(), findUnique: jest.fn() },
    paymentMethod: { findFirst: jest.fn() },
    userRole: { findMany: jest.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    service = new SubscriptionsService(prisma, settingsService, cache);
    jest.clearAllMocks();
  });

  it('rejects subscribe when PREMIUM is enabled but payments gateway is off', async () => {
    (settingsService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (settingsService.isPaymentsGatewayEnabled as jest.Mock).mockResolvedValue(false);

    await expect(
      service.subscribe('user-1', { plan: SubscriptionPlan.MONTHLY }),
    ).rejects.toMatchObject({
      response: { code: 'PAYMENTS_NOT_ENABLED' },
    });
  });

  it('rejects subscribe when gateway is on but payment method is missing', async () => {
    (settingsService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (settingsService.isPaymentsGatewayEnabled as jest.Mock).mockResolvedValue(true);

    await expect(
      service.subscribe('user-1', { plan: SubscriptionPlan.MONTHLY }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects subscribe when PREMIUM feature flag is disabled', async () => {
    (settingsService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);

    await expect(
      service.subscribe('user-1', { plan: SubscriptionPlan.MONTHLY }),
    ).rejects.toThrow(ForbiddenException);
  });
});
