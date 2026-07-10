import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { RejectActionDto } from './dto/reject-action.dto';
import { AdminNoteDto } from './dto/admin-note.dto';
import { CreateRiskFlagDto } from '../risk/dto/create-risk-flag.dto';
import { UpdateRiskFlagDto } from '../risk/dto/update-risk-flag.dto';
import { RollupDto } from './dto/rollup.dto';
import { AdminRoleDto, CreateAdminUserDto } from './dto/admin-users.dto';
import { ListingContactUpdatesQueryDto, UpdateListingContactDto } from './dto/listing-contact-update.dto';
import { AdminOperationsService } from './admin-operations.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('admin', 'moderator')
@Controller('admin')
export class AdminOperationsController {
  constructor(private readonly admin: AdminOperationsService) {}

  @Get('overview') overview() { return this.admin.overview(); }
  @Get('reports') reports(@Query('status') status?: string, @Query('entityType') entityType?: string, @Query('reasonCode') reasonCode?: string) {
    return this.admin.reports({ status, entityType, reasonCode });
  }
  @Get('verification-requests') verificationRequests() { return this.admin.verificationRequests(); }
  @Get('audit-logs') auditLogs(@Query('limit') limit?: string) { return this.admin.auditLogs(Number(limit ?? 100)); }
  @Get('analytics/summary') analyticsSummary(@Query('range') range?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.admin.analyticsSummary({ range, from, to });
  }
  @Get('payments') payments() { return this.admin.payments(); }
  @Get('listings') listings(@Query('status') status?: string) { return this.admin.listings({ status }); }
  @Get('listing-contact-updates')
  @RequireRoles('admin')
  listingContactUpdates(@Query() query: ListingContactUpdatesQueryDto) {
    return this.admin.listingContactUpdates(query);
  }

  @Patch('listing-contact-updates/:id')
  @RequireRoles('admin')
  updateListingContact(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateListingContactDto) {
    return this.admin.updateListingContact(user.id, id, dto);
  }

  @Get('projects') projects(@Query('status') status?: string) { return this.admin.projects({ status }); }
  @Get('promotions') promotions(@Query('status') status?: string) { return this.admin.promotions({ status }); }
  @Get('subscriptions') subscriptions(@Query('status') status?: string) { return this.admin.subscriptions({ status }); }
  @Get('cms/pages') cmsPages() { return this.admin.cmsPages(); }
  @Get('cms/blog-posts') blogPosts() { return this.admin.blogPosts(); }
  @Get('users') users() { return this.admin.users(); }
  @Get('users/:id') user(@Param('id') id: string) { return this.admin.user(id); }
  @Post('users/create-admin') createAdminUser(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdminUserDto) { return this.admin.createAdminUser(user.id, dto); }
  @Post('payments/:id/reconcile') reconcilePayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.admin.reconcilePayment(user.id, id); }
  @Post('analytics/rollups/run') runRollups(@Body() dto: RollupDto) { return this.admin.runRollups(dto); }
  @Post('analytics/rollups/rebuild') rebuildRollups(@Body() dto: RollupDto) { return this.admin.runRollups(dto); }
  @Get('analytics/rollups/status') rollupStatus() { return this.admin.rollupStatus(); }
  @Get('data-integrity/check') dataIntegrityCheck() { return this.admin.dataIntegrityCheck(); }
  @Post('data-integrity/repair') dataIntegrityRepair(@CurrentUser() user: AuthenticatedUser) { return this.admin.dataIntegrityRepair(user.id); }

  @Post('verification-requests/:id/approve')
  approveVerification(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.reviewVerification(user.id, id, 'approved');
  }

  @Post('verification-requests/:id/reject')
  rejectVerification(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectActionDto) {
    return this.admin.reviewVerification(user.id, id, 'rejected', dto.reason);
  }

  @Post('listings/:id/approve')
  approveListing(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.reviewListing(user.id, id, 'approved');
  }

  @Post('listings/:id/reject')
  rejectListing(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectActionDto) {
    return this.admin.reviewListing(user.id, id, 'rejected', dto.reason);
  }

  @Post('projects/:id/approve')
  approveProject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.reviewProject(user.id, id, 'approved');
  }

  @Post('projects/:id/reject')
  rejectProject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectActionDto) {
    return this.admin.reviewProject(user.id, id, 'rejected', dto.reason);
  }

  @Post('users/:id/suspend') suspendUser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.setUserStatus(user.id, id, 'SUSPENDED');
  }

  @Post('users/:id/block') blockUser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.setUserStatus(user.id, id, 'SUSPENDED');
  }

  @Post('users/:id/unsuspend') unsuspendUser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.setUserStatus(user.id, id, 'ACTIVE');
  }

  @Post('users/:id/unblock') unblockUser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.setUserStatus(user.id, id, 'ACTIVE');
  }

  @Post('users/:id/approve') approveUser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.setUserStatus(user.id, id, 'ACTIVE');
  }

  @Post('users/:id/roles') addUserRole(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdminRoleDto) {
    return this.admin.addUserRole(user.id, id, dto);
  }

  @Delete('users/:id/roles/:roleId') removeUserRole(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('roleId') roleId: string) {
    return this.admin.removeUserRole(user.id, id, roleId);
  }

  @Post('reports/:id/resolve') resolveReport(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectActionDto) {
    return this.admin.reviewReport(user.id, id, 'resolved', dto.reason);
  }

  @Post('reports/:id/dismiss') dismissReport(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectActionDto) {
    return this.admin.reviewReport(user.id, id, 'dismissed', dto.reason);
  }

  @Post('duplicate-candidates/:id/confirm') confirmDuplicate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.reviewDuplicate(user.id, id, 'confirmed');
  }

  @Post('duplicate-candidates/:id/dismiss') dismissDuplicate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.reviewDuplicate(user.id, id, 'dismissed');
  }

  @Post('admin-notes') createNote(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdminNoteDto) {
    return this.admin.createNote(user.id, dto);
  }

  @Get('admin-notes') notes(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.admin.notes({ entityType, entityId });
  }

  @Post('risk-flags') createRiskFlag(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRiskFlagDto) {
    return this.admin.createRiskFlag(user.id, dto);
  }

  @Get('risk-flags') riskFlags(@Query('status') status?: string, @Query('entityType') entityType?: string) {
    return this.admin.riskFlags({ status, entityType });
  }

  @Post('risk-flags/:id') updateRiskFlag(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRiskFlagDto) {
    return this.admin.updateRiskFlag(user.id, id, dto);
  }
}
