import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user.id, dto);
  }

  @Post('webhook/:provider')
  webhook(@Param('provider') provider: string, @Body() dto: PaymentWebhookDto) {
    return this.payments.handleWebhook(provider, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.payments.mine(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payments.getMine(user.id, id);
  }
}
