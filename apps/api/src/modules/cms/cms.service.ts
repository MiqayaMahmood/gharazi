import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '@Gharazi/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createPage(userId: string, dto: CreateCmsPageDto) {
    const page = await this.prisma.cmsPage.create({
      data: {
        title: dto.title,
        slug: dto.slug ?? slugify(dto.title),
        contentJson: dto.contentJson as Prisma.InputJsonValue,
        status: dto.status ?? 'draft',
        publishedAt: dto.status === 'published' ? new Date() : undefined,
        createdByUserId: userId,
      },
    });
    await this.audit.record({ actorUserId: userId, action: 'cms.page.create', entityType: 'cms_page', entityId: page.id });
    return page;
  }

  async updatePage(userId: string, id: string, dto: UpdateCmsPageDto) {
    const page = await this.prisma.cmsPage.update({
      where: { id },
      data: {
        ...dto,
        slug: dto.slug ?? (dto.title ? slugify(dto.title) : undefined),
        contentJson: dto.contentJson as Prisma.InputJsonValue | undefined,
        publishedAt: dto.status === 'published' ? new Date() : undefined,
      },
    });
    await this.audit.record({ actorUserId: userId, action: 'cms.page.update', entityType: 'cms_page', entityId: id });
    return page;
  }

  getPage(slug: string) { return this.prisma.cmsPage.findFirstOrThrow({ where: { slug, status: 'published' } }); }

  async createPost(userId: string, dto: CreateBlogPostDto) {
    const post = await this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug: dto.slug ?? slugify(dto.title),
        excerpt: dto.excerpt,
        contentJson: dto.contentJson as Prisma.InputJsonValue,
        coverImageUrl: dto.coverImageUrl,
        status: dto.status ?? 'draft',
        publishedAt: dto.status === 'published' ? new Date() : undefined,
        authorUserId: userId,
      },
    });
    await this.audit.record({ actorUserId: userId, action: 'cms.blog.create', entityType: 'blog_post', entityId: post.id });
    return post;
  }

  async updatePost(userId: string, id: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...dto,
        slug: dto.slug ?? (dto.title ? slugify(dto.title) : undefined),
        contentJson: dto.contentJson as Prisma.InputJsonValue | undefined,
        publishedAt: dto.status === 'published' ? new Date() : undefined,
      },
    });
    await this.audit.record({ actorUserId: userId, action: 'cms.blog.update', entityType: 'blog_post', entityId: id });
    return post;
  }

  listPosts() { return this.prisma.blogPost.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' } }); }
  getPost(slug: string) { return this.prisma.blogPost.findFirstOrThrow({ where: { slug, status: 'published' } }); }
}
