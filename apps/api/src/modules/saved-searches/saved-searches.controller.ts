import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import { SavedSearchesService } from './saved-searches.service';

@ApiTags('saved-searches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearchesService.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSavedSearchDto) {
    return this.savedSearchesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.savedSearchesService.remove(user.id, id);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.savedSearchesService.list(user.id);
  }
}
