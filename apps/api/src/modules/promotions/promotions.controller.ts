import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePromotionDto) {
    return this.promotions.create(user.id, dto);
  }

  @Patch(':id') update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(user.id, id, dto);
  }

  @Get('me') mine(@CurrentUser() user: AuthenticatedUser) {
    return this.promotions.mine(user.id);
  }

  @Post(':id/cancel') cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.promotions.cancel(user.id, id);
  }
}
