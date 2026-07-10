import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { BatchIdsDto } from '../../common/dto/batch-ids.dto';
import { AddProjectMediaDto } from './dto/add-project-media.dto';
import { AddProjectUnitDto } from './dto/add-project-unit.dto';
import { AddProjectUpdateDto } from './dto/add-project-update.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectUnitDto } from './dto/update-project-unit.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Post('batch')
  batch(@Body() dto: BatchIdsDto) {
    return this.projectsService.batchPublic(dto.ids);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listMine(user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(user.id, id, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.publish(user.id, id);
  }

  @Post(':id/archive')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.archive(user, id);
  }

  @Get(':id/owner-summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  ownerSummary(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.ownerSummary(user, id);
  }

  @Get(':id/viewer-context')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  viewerContext(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.viewerContext(user, id);
  }

  @Post(':id/units')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addUnit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddProjectUnitDto) {
    return this.projectsService.addUnit(user.id, id, dto);
  }

  @Patch(':id/units/:unitId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateUnit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('unitId') unitId: string,
    @Body() dto: UpdateProjectUnitDto,
  ) {
    return this.projectsService.updateUnit(user.id, id, unitId, dto);
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addMedia(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddProjectMediaDto) {
    return this.projectsService.addMedia(user.id, id, dto);
  }

  @Post(':id/updates')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddProjectUpdateDto,
  ) {
    return this.projectsService.addUpdate(user.id, id, dto);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.projectsService.getPublic(slug);
  }
}
