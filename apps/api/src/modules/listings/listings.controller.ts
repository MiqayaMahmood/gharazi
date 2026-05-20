import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { BatchIdsDto } from '../../common/dto/batch-ids.dto';
import { AddListingMediaDto } from './dto/add-listing-media.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListingDto) {
    return this.listingsService.create(user.id, dto);
  }

  @Post('batch')
  batch(@Body() dto: BatchIdsDto) {
    return this.listingsService.batchPublic(dto.ids);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.listingsService.listMine(user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(user.id, id, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.publish(user.id, id);
  }

  @Post(':id/archive')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.archive(user.id, id);
  }

  @Post(':id/refresh')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  refresh(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.refresh(user.id, id);
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddListingMediaDto,
  ) {
    return this.listingsService.addMedia(user.id, id, dto);
  }

  @Get(':publicId')
  getByPublicId(@Param('publicId') publicId: string) {
    return this.listingsService.getPublic(publicId);
  }
}
