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

  @Get('me/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mineOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.getMine(user.id, id);
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
    return this.listingsService.archive(user, id);
  }

  @Post(':id/refresh')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  refresh(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.refresh(user, id);
  }

  @Post(':id/mark-sold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markSold(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.markStatus(user, id, 'sold');
  }

  @Post(':id/mark-rented')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markRented(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.markStatus(user, id, 'rented');
  }

  @Get(':id/owner-summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  ownerSummary(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.ownerSummary(user, id);
  }

  @Get(':id/viewer-context')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  viewerContext(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listingsService.viewerContext(user, id);
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

  @Get(':id/contact')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  contact(@Param('id') id: string) {
    return this.listingsService.getContact(id);
  }

  @Get(':publicId')
  getByPublicId(@Param('publicId') publicId: string) {
    return this.listingsService.getPublic(publicId);
  }
}
