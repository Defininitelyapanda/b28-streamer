import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SUBSCRIPTION_REQUIREMENTS_KEY,
  SubscriptionRequirement,
} from '../decorators/subscription.decorators';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      process.env.DEV_BYPASS_STREAMING === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return true;
    }

    const requirement = this.reflector.getAllAndOverride<SubscriptionRequirement>(
      SUBSCRIPTION_REQUIREMENTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
    }

    if (requirement === SubscriptionRequirement.STREAMING) {
      const hasAccess = await this.subscriptionsService.canStream(user.id);
      if (!hasAccess) {
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'An active subscription is required to stream.',
        });
      }
      return true;
    }

    if (requirement === SubscriptionRequirement.PREMIUM) {
      const sub = await this.subscriptionsService.getMySubscription(user.id);
      if (!sub.isPremium) {
        throw new ForbiddenException({
          code: 'PREMIUM_REQUIRED',
          message: 'Premium subscription required.',
        });
      }
      return true;
    }

    return true;
  }
}
