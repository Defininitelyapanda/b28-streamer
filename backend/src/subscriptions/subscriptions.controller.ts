import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AddPaymentMethodDto, SubscribeDto } from './dto/subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('offers')
  getOffers() {
    return this.subscriptionsService.getOffers();
  }

  @ApiBearerAuth()
  @Get('me')
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getMySubscription(user.id);
  }

  @ApiBearerAuth()
  @Post('subscribe')
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('continue-with-ads')
  continueWithAds(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.continueWithAds(user.id);
  }

  @ApiBearerAuth()
  @Get('payment-methods')
  listPaymentMethods(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.listPaymentMethods(user.id);
  }

  @ApiBearerAuth()
  @Post('payment-methods')
  addPaymentMethod(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddPaymentMethodDto) {
    return this.subscriptionsService.addPaymentMethod(user.id, dto);
  }

  @ApiBearerAuth()
  @Delete('payment-methods/:id')
  removePaymentMethod(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.subscriptionsService.removePaymentMethod(user.id, id);
  }
}
