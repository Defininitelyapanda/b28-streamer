import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentMethodType,
  RoleName,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { SettingsService } from '../settings/settings.service';
import { AddPaymentMethodDto, SubscribeDto } from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private cache: CacheService,
  ) {}

  async getOffers() {
    const keys = [
      'subscription.monthly_price',
      'subscription.annual_price',
      'subscription.annual_discount_percent',
      'subscription.currency',
      'ads.free_ads_enabled',
      'ads.premium_ads_enabled',
    ];
    const settings = await this.prisma.platformSetting.findMany({
      where: { key: { in: keys } },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    return {
      currency: String(map['subscription.currency'] ?? 'KES'),
      monthly: {
        plan: SubscriptionPlan.MONTHLY,
        price: Number(map['subscription.monthly_price'] ?? 400),
        label: 'Monthly Premium',
        adsEnabled: false,
      },
      annual: {
        plan: SubscriptionPlan.ANNUAL,
        price: Number(map['subscription.annual_price'] ?? 4320),
        discountPercent: Number(map['subscription.annual_discount_percent'] ?? 10),
        label: 'Annual Premium',
        adsEnabled: false,
      },
      paymentMethods: ['MPESA', 'PAYPAL', 'CARD'],
    };
  }

  async getMySubscription(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({ where: { userId } });
    if (!sub) {
      return {
        plan: SubscriptionPlan.FREE_WITH_ADS,
        status: SubscriptionStatus.ACTIVE,
        adsEnabled: true,
        isPremium: false,
        expiresAt: null,
      };
    }
    const isPremium =
      sub.status === SubscriptionStatus.ACTIVE &&
      sub.plan !== SubscriptionPlan.FREE_WITH_ADS &&
      (!sub.expiresAt || sub.expiresAt > new Date());

    return {
      plan: sub.plan,
      status: sub.status,
      adsEnabled: sub.adsEnabled,
      isPremium,
      expiresAt: sub.expiresAt?.toISOString() ?? null,
    };
  }

  async canStream(userId: string): Promise<boolean> {
    const cacheKey = `canStream:${userId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    const sub = await this.getMySubscription(userId);
    if (sub.isPremium) {
      await this.cache.set(cacheKey, true, 30);
      return true;
    }

    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const allowed = roles.some((r) => r.role.name === RoleName.FILMMAKER);
    await this.cache.set(cacheKey, allowed, 30);
    return allowed;
  }

  async continueWithAds(_userId: string) {
    throw new ForbiddenException({
      code: 'FREE_TIER_DISABLED',
      message: 'Free streaming is no longer available.',
    });
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    if (dto.plan === SubscriptionPlan.FREE_WITH_ADS) {
      throw new ForbiddenException({
        code: 'FREE_TIER_DISABLED',
        message: 'Free streaming is no longer available.',
      });
    }

    const premiumEnabled = await this.settingsService.isFeatureEnabled('PREMIUM');
    const gatewayEnabled = await this.settingsService.isPaymentsGatewayEnabled();
    // #region agent log
    fetch('http://127.0.0.1:7533/ingest/e9d0989d-a309-403f-b88e-6328f60ff267',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9ead3f'},body:JSON.stringify({sessionId:'9ead3f',location:'subscriptions.service.ts:subscribe',message:'subscribe guard state',data:{premiumEnabled,gatewayEnabled,hasPaymentMethod:Boolean(dto.paymentMethodId),plan:dto.plan},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!premiumEnabled) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: 'Premium subscriptions are not enabled.',
      });
    }

    if (!gatewayEnabled) {
      throw new ForbiddenException({
        code: 'PAYMENTS_NOT_ENABLED',
        message: 'Payment gateway is not enabled.',
      });
    }

    if (!dto.paymentMethodId) {
      throw new BadRequestException({
        code: 'PAYMENT_METHOD_REQUIRED',
        message: 'A payment method is required.',
      });
    }

    if (dto.paymentMethodId) {
      const method = await this.prisma.paymentMethod.findFirst({
        where: { id: dto.paymentMethodId, userId },
      });
      if (!method) {
        throw new NotFoundException({ code: 'PAYMENT_METHOD_NOT_FOUND', message: 'Payment method not found.' });
      }
    }

    const months = dto.plan === SubscriptionPlan.ANNUAL ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: dto.plan,
        status: SubscriptionStatus.ACTIVE,
        adsEnabled: false,
        expiresAt,
      },
      update: {
        plan: dto.plan,
        status: SubscriptionStatus.ACTIVE,
        adsEnabled: false,
        expiresAt,
      },
    });

    await this.cache.del(`canStream:${userId}`);

    return this.getMySubscription(userId);
  }

  async listPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addPaymentMethod(userId: string, dto: AddPaymentMethodDto) {
    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const count = await this.prisma.paymentMethod.count({ where: { userId } });

    return this.prisma.paymentMethod.create({
      data: {
        userId,
        type: dto.type as PaymentMethodType,
        label: dto.label,
        last4: dto.last4 ?? null,
        isDefault: dto.isDefault ?? count === 0,
        metadata: dto.phone ? { phone: dto.phone } : undefined,
      },
    });
  }

  async removePaymentMethod(userId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!method) {
      throw new NotFoundException({ code: 'PAYMENT_METHOD_NOT_FOUND', message: 'Payment method not found.' });
    }
    await this.prisma.paymentMethod.delete({ where: { id } });
    return { message: 'Payment method removed.' };
  }
}
