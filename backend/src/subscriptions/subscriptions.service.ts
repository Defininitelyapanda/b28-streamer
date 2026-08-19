import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  PaymentMethodType,
  RoleName,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AddPaymentMethodDto, SubscribeDto } from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
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
    const sub = await this.getMySubscription(userId);
    if (sub.isPremium) return true;

    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.some((r) => r.role.name === RoleName.FILMMAKER);
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

    if (!(await this.settingsService.isFeatureEnabled('PREMIUM'))) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: 'Premium subscriptions are not enabled.',
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
