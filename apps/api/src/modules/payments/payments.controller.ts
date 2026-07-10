import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';
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

  @Get('packages')
  packages() { return this.payments.packages(); }

  @Post('webhook/stripe')
  stripeWebhook(@Req() request: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    if (!request.rawBody || !signature) throw new BadRequestException('Stripe signature and raw body are required');
    try { return this.payments.handleStripeEvent(this.payments.constructEvent(request.rawBody, signature)); }
    catch { throw new BadRequestException('Stripe webhook signature is invalid'); }
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.payments.mine(user.id);
  }

  @Get('session/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sessionStatus(@CurrentUser() user: AuthenticatedUser, @Query('sessionId') sessionId: string) { return this.payments.getBySession(user.id, sessionId); }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payments.getMine(user.id, id);
  }
}
