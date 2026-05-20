import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({ imports: [AnalyticsModule], controllers: [FavoritesController], providers: [FavoritesService] })
export class FavoritesModule {}
