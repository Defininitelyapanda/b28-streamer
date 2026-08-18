import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import {
  SUBSCRIPTION_REQUIREMENTS_KEY,
  SubscriptionRequirement,
} from '../decorators/subscription.decorators';
import { SubscriptionGuard } from './subscription.guard';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

describe('SubscriptionGuard', () => {
  const reflector = new Reflector();
  const subscriptionsService = {
    getMySubscription: jest.fn(),
  } as unknown as SubscriptionsService;

  const guard = new SubscriptionGuard(reflector, subscriptionsService);

  function contextWithUser(userId = 'user-1'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: userId, roles: ['STREAMER'] } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows when no subscription requirement is set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(contextWithUser())).resolves.toBe(true);
  });

  it('requires active streaming subscription', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionRequirement.STREAMING);
    (subscriptionsService.getMySubscription as jest.Mock).mockResolvedValue({
      plan: SubscriptionPlan.FREE_WITH_ADS,
      status: SubscriptionStatus.ACTIVE,
      isPremium: false,
      adsEnabled: true,
    });

    await expect(guard.canActivate(contextWithUser())).resolves.toBe(true);
  });

  it('blocks premium-only routes for free users', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionRequirement.PREMIUM);
    (subscriptionsService.getMySubscription as jest.Mock).mockResolvedValue({
      plan: SubscriptionPlan.FREE_WITH_ADS,
      status: SubscriptionStatus.ACTIVE,
      isPremium: false,
      adsEnabled: true,
    });

    await expect(guard.canActivate(contextWithUser())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses subscription metadata key', () => {
    expect(SUBSCRIPTION_REQUIREMENTS_KEY).toBe('subscriptionRequirements');
    expect(SubscriptionRequirement.STREAMING).toBe('streaming');
  });
});
