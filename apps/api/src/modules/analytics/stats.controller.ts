import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('popular')
  popular(@Query('entityType') entityType = 'listing', @Query('purpose') purpose?: string, @Query('limit') limit?: string, @Query('period') period?: string) {
    return this.analytics.popular(entityType, { purpose, period, limit: limit ? Number(limit) : undefined });
  }

  @Get('entity/:entityType/:entityId')
  entity(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.analytics.entityStats(entityType, entityId);
  }
}
