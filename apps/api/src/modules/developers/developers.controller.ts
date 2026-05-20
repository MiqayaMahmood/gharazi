import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CreateDeveloperProfileDto } from './dto/create-developer-profile.dto';
import { UpdateDeveloperProfileDto } from './dto/update-developer-profile.dto';
import { DevelopersService } from './developers.service';

@ApiTags('developers')
@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @Post('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDeveloperProfileDto) {
    return this.developersService.createProfile(user.id, dto);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDeveloperProfileDto) {
    return this.developersService.updateProfile(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.developersService.getMine(user.id);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.developersService.getBySlug(slug);
  }
}
