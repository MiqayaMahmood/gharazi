import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { StatsController } from './stats.controller';

@Module({ controllers: [AnalyticsController, StatsController], providers: [AnalyticsService], exports: [AnalyticsService] })
export class AnalyticsModule {}
