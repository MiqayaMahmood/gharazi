import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { SwapAliasDto } from './dto/swap-alias.dto';
import { SearchOpsService } from './search-ops.service';

@ApiTags('admin-search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('admin')
@Controller('admin/search')
export class SearchOpsController {
  constructor(private readonly searchOps: SearchOpsService) {}

  @Post('bootstrap') bootstrap(@CurrentUser() user: AuthenticatedUser) { return this.searchOps.bootstrap(user.id); }
  @Post('reindex/listings') reindexListings(@CurrentUser() user: AuthenticatedUser) { return this.searchOps.reindexListings(user.id); }
  @Post('reindex/projects') reindexProjects(@CurrentUser() user: AuthenticatedUser) { return this.searchOps.reindexProjects(user.id); }
  @Post('reindex/areas') reindexAreas(@CurrentUser() user: AuthenticatedUser) { return this.searchOps.reindexAreas(user.id); }
  @Post('reindex/listings/:id') reindexListing(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.searchOps.reindexListing(user.id, id); }
  @Post('reindex/projects/:id') reindexProject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.searchOps.reindexProject(user.id, id); }
  @Post('aliases/swap') swap(@CurrentUser() user: AuthenticatedUser, @Body() dto: SwapAliasDto) { return this.searchOps.swapAlias(user.id, dto); }
  @Get('status') status() { return this.searchOps.status(); }
}
