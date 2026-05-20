import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AssignSubmissionDto, UpdateSubmissionStatusDto } from './dto/admin-submission.dto';
import { CreateContactDto, CreateFeedbackDto, CreateSupportRequestDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('feedback')
  feedback(@Body() dto: CreateFeedbackDto, @Headers('authorization') authorization?: string) {
    return this.submissions.create('feedback', dto, this.bearerToken(authorization));
  }

  @Post('contact')
  contact(@Body() dto: CreateContactDto, @Headers('authorization') authorization?: string) {
    return this.submissions.create('contact', dto, this.bearerToken(authorization));
  }

  @Post('support-requests')
  support(@Body() dto: CreateSupportRequestDto, @Headers('authorization') authorization?: string) {
    return this.submissions.create('support', dto, this.bearerToken(authorization));
  }

  @Get('admin/submissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('admin', 'moderator', 'support')
  adminList(
    @Query('submissionType') submissionType?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.submissions.list({ submissionType, status, q, from, to });
  }

  @Get('admin/submissions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('admin', 'moderator', 'support')
  adminGet(@Param('id') id: string) {
    return this.submissions.get(id);
  }

  @Patch('admin/submissions/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('admin', 'moderator', 'support')
  adminStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSubmissionStatusDto) {
    return this.submissions.updateStatus(user.id, id, dto.status, dto.adminNotes);
  }

  @Patch('admin/submissions/:id/assign')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('admin', 'moderator', 'support')
  adminAssign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignSubmissionDto) {
    return this.submissions.assign(user.id, id, dto.assignedToUserId, dto.adminNotes);
  }

  private bearerToken(authorization?: string) {
    return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
  }
}
