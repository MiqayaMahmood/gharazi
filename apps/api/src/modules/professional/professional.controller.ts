import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateProfessionalProfileDto, UpdateProfessionalProfileDto } from './dto/professional-profile.dto';
import { ProfessionalService } from './professional.service';

@ApiTags('professional') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('professional')
export class ProfessionalController {
  constructor(private readonly professional: ProfessionalService) {}
  @Get('profile/me') me(@CurrentUser() user: AuthenticatedUser) { return this.professional.me(user.id); }
  @Post('profile') create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProfessionalProfileDto) { return this.professional.create(user.id, dto); }
  @Patch('profile') update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfessionalProfileDto) { return this.professional.update(user.id, dto); }
  @Post('profile/request-verification') requestVerification(@CurrentUser() user: AuthenticatedUser) { return this.professional.requestVerification(user.id); }
  @Get('limits/me') limits(@CurrentUser() user: AuthenticatedUser) { return this.professional.limits(user.id); }
  @Get('dashboard/summary') summary(@CurrentUser() user: AuthenticatedUser) { return this.professional.summary(user.id); }
}
