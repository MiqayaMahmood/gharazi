import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { FavoriteDto, type FavoriteEntityType } from './dto/favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService, private readonly analytics: AnalyticsService) {}

  async add(userId: string, dto: FavoriteDto) {
    await this.assertEntityExists(dto);
    const favorite = await this.prisma.favorite.upsert({
      where: { userId_entityType_entityId: { userId, entityType: dto.entityType, entityId: dto.entityId } },
      update: {},
      create: { userId, ...dto },
    });
    await this.analytics.record({
      eventType: `${dto.entityType}_favorited`,
      entityType: dto.entityType,
      entityId: dto.entityId,
      userId,
      idempotencyKey: `favorite:${userId}:${dto.entityType}:${dto.entityId}`,
    });
    return favorite;
  }

  async remove(userId: string, dto: FavoriteDto) {
    await this.prisma.favorite.deleteMany({ where: { userId, ...dto } });
    return { ok: true };
  }

  async list(userId: string, entityType?: FavoriteEntityType) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    if (!favorites.length) return [];

    const listings = await this.hydrateListings(this.idsFor(favorites, 'listing'));
    const projects = await this.hydrateProjects(this.idsFor(favorites, 'project'));
    const developers = await this.hydrateDevelopers(this.idsFor(favorites, 'developer'));
    const areas = await this.hydrateAreas(this.idsFor(favorites, 'area'));
    const blogs = await this.hydrateBlogs(this.idsFor(favorites, 'blog'));

    return favorites.map((favorite) => {
      const listing = listings.get(favorite.entityId);
      const project = projects.get(favorite.entityId);
      const developer = developers.get(favorite.entityId);
      const area = areas.get(favorite.entityId);
      const blog = blogs.get(favorite.entityId);
      return {
        ...favorite,
        listing,
        project,
        developer,
        area,
        blog,
        title: listing?.title ?? project?.name ?? developer?.companyName ?? area?.name ?? blog?.title,
        imageUrl: listing?.coverImageUrl ?? project?.coverImageUrl ?? developer?.logoUrl ?? blog?.coverImageUrl,
        url: this.favoriteUrl(favorite.entityType, listing, project, developer, area, blog),
      };
    });
  }

  private async assertEntityExists(dto: FavoriteDto) {
    const found = await this.findEntity(dto.entityType, dto.entityId);
    if (!found) throw new NotFoundException('Favorite target was not found');
  }

  private findEntity(entityType: FavoriteEntityType, entityId: string) {
    if (entityType === 'listing') return this.prisma.listing.findFirst({ where: { id: entityId, deletedAt: null } });
    if (entityType === 'project') return this.prisma.project.findFirst({ where: { id: entityId, deletedAt: null } });
    if (entityType === 'developer') return this.prisma.developer.findUnique({ where: { id: entityId } });
    if (entityType === 'area') return this.prisma.area.findFirst({ where: { id: entityId, isActive: true } });
    return this.prisma.blogPost.findFirst({ where: { id: entityId, status: 'published' } });
  }

  private idsFor(favorites: Array<{ entityType: string; entityId: string }>, entityType: FavoriteEntityType) {
    return favorites.filter((favorite) => favorite.entityType === entityType).map((favorite) => favorite.entityId);
  }

  private async hydrateListings(ids: string[]) {
    if (!ids.length) return new Map<string, any>();
    const listings = await this.prisma.listing.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: {
        city: true,
        area: true,
        purpose: true,
        propertyType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      },
    });
    return new Map(
      listings.map((listing) => [
        listing.id,
        {
          id: listing.id,
          publicId: listing.publicId,
          title: listing.title,
          description: listing.description,
          priceAmount: Number(listing.priceAmount),
          cityName: listing.city.name,
          areaName: listing.area.name,
          propertyTypeName: listing.propertyType.name,
          purposeName: listing.purpose.name,
          bedrooms: listing.bedrooms ?? undefined,
          bathrooms: listing.bathrooms ?? undefined,
          areaValue: Number(listing.areaValue),
          areaUnit: listing.areaUnit,
          coverImageUrl: listing.media[0]?.url,
          verificationStatus: listing.verificationStatus,
          isFeatured: listing.isFeatured,
          updatedAt: listing.updatedAt.toISOString(),
          publishedAt: listing.publishedAt?.toISOString(),
        },
      ]),
    );
  }

  private async hydrateProjects(ids: string[]) {
    if (!ids.length) return new Map<string, any>();
    const projects = await this.prisma.project.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: {
        developer: true,
        city: true,
        area: true,
        projectType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      },
    });
    return new Map(
      projects.map((project) => [
        project.id,
        {
          id: project.id,
          publicId: project.publicId,
          slug: project.slug,
          name: project.name,
          description: project.description,
          developerName: project.developer.companyName,
          cityName: project.city.name,
          areaName: project.area.name,
          projectTypeName: project.projectType.name,
          possessionStatus: project.possessionStatus,
          legalStatus: project.legalStatus ?? undefined,
          verificationStatus: project.verificationStatus,
          minPriceAmount: project.minPriceAmount ? Number(project.minPriceAmount) : undefined,
          maxPriceAmount: project.maxPriceAmount ? Number(project.maxPriceAmount) : undefined,
          coverImageUrl: project.media[0]?.url,
          launchDate: project.launchDate?.toISOString(),
          expectedHandoverDate: project.expectedHandoverDate?.toISOString(),
          paymentPlanSummary: project.paymentPlanSummary ?? undefined,
        },
      ]),
    );
  }

  private async hydrateDevelopers(ids: string[]) {
    if (!ids.length) return new Map<string, any>();
    const developers = await this.prisma.developer.findMany({
      where: { id: { in: ids } },
      select: { id: true, companyName: true, slug: true, logoUrl: true, verificationStatus: true, description: true },
    });
    return new Map(developers.map((developer) => [developer.id, developer]));
  }

  private async hydrateAreas(ids: string[]) {
    if (!ids.length) return new Map<string, any>();
    const areas = await this.prisma.area.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { city: true },
    });
    return new Map(
      areas.map((area) => [
        area.id,
        {
          id: area.id,
          name: area.name,
          slug: area.slug,
          cityName: area.city.name,
          citySlug: area.city.slug,
          url: `/area/${area.slug}`,
        },
      ]),
    );
  }

  private async hydrateBlogs(ids: string[]) {
    if (!ids.length) return new Map<string, any>();
    const posts = await this.prisma.blogPost.findMany({
      where: { id: { in: ids }, status: 'published' },
      select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true, publishedAt: true },
    });
    return new Map(posts.map((post) => [post.id, post]));
  }

  private favoriteUrl(entityType: string, listing?: any, project?: any, developer?: any, area?: any, blog?: any) {
    if (entityType === 'listing' && listing?.publicId) return `/listing/${listing.publicId}`;
    if (entityType === 'project' && project?.slug) return `/project/${project.slug}`;
    if (entityType === 'developer' && developer?.slug) return `/developers/${developer.slug}`;
    if (entityType === 'area' && area?.slug) return `/area/${area.slug}`;
    if (entityType === 'blog' && blog?.slug) return `/blog/${blog.slug}`;
    return undefined;
  }
}
