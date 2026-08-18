import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PaymentMethodType, SubscriptionPlan } from '@prisma/client';

export class AddPaymentMethodDto {
  @IsEnum(PaymentMethodType)
  type!: PaymentMethodType;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  last4?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SubscribeDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
