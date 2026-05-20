import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto';
import { CmsService } from './cms.service';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Post('pages') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @RequireRoles('admin', 'moderator')
  createPage(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCmsPageDto) { return this.cms.createPage(user.id, dto); }

  @Patch('pages/:id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @RequireRoles('admin', 'moderator')
  updatePage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCmsPageDto) { return this.cms.updatePage(user.id, id, dto); }

  @Get('pages/:slug') page(@Param('slug') slug: string) { return this.cms.getPage(slug); }

  @Post('blog-posts') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @RequireRoles('admin', 'moderator')
  createPost(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBlogPostDto) { return this.cms.createPost(user.id, dto); }

  @Patch('blog-posts/:id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @RequireRoles('admin', 'moderator')
  updatePost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBlogPostDto) { return this.cms.updatePost(user.id, id, dto); }

  @Get('blog-posts') posts() { return this.cms.listPosts(); }
  @Get('blog-posts/:slug') post(@Param('slug') slug: string) { return this.cms.getPost(slug); }
}
