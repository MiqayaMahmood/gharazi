import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { VerificationService } from './verification.service';

@ApiTags('verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verification-requests')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVerificationRequestDto) {
    return this.verificationService.create(user.id, dto);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.verificationService.mine(user.id);
  }
}
