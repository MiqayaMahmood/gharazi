import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerationService } from './moderation.service';

@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  report(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.moderationService.report(user.id, dto);
  }
}
