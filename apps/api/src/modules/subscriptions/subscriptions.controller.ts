import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('plans') plans() { return this.subscriptions.plans(); }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.create(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) { return this.subscriptions.mine(user.id); }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.subscriptions.cancel(user.id, id);
  }
}
