import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_REQUIREMENTS_KEY = 'subscriptionRequirements';

export enum SubscriptionRequirement {
  STREAMING = 'streaming',
  PREMIUM = 'premium',
}

export const RequireStreamingAccess = () =>
  SetMetadata(SUBSCRIPTION_REQUIREMENTS_KEY, SubscriptionRequirement.STREAMING);

export const RequirePremium = () =>
  SetMetadata(SUBSCRIPTION_REQUIREMENTS_KEY, SubscriptionRequirement.PREMIUM);
