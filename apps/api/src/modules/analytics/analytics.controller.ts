import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { RecordAnalyticsEventDto } from './dto/record-analytics-event.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('listings/:id/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listing(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.analytics.listingSummary(user.id, id);
  }

  @Get('projects/:id/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  project(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.analytics.projectSummary(user.id, id);
  }

  @Post('events')
  record(@Body() dto: RecordAnalyticsEventDto) {
    return this.analytics.record(dto);
  }
}
