import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { FAVORITE_ENTITY_TYPES, FavoriteDto, type FavoriteEntityType } from './dto/favorite.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: FavoriteDto) {
    return this.favoritesService.add(user.id, dto);
  }

  @Delete()
  remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: FavoriteDto) {
    return this.favoritesService.remove(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('entityType') entityType?: FavoriteEntityType) {
    const normalizedType = FAVORITE_ENTITY_TYPES.includes(entityType as FavoriteEntityType) ? entityType : undefined;
    return this.favoritesService.list(user.id, normalizedType);
  }
}
