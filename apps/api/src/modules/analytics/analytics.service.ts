import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async listingSummary(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    if (listing.ownerUserId !== userId && listing.managedByUserId !== userId) throw new ForbiddenException();
    const stats = await this.prisma.listingDailyStat.aggregate({
      where: { listingId },
      _sum: { viewsCount: true, uniqueViewsCount: true, chatsStartedCount: true, inquiriesCount: true, savesCount: true },
    });
    return { listingId, status: listing.status, ...stats._sum };
  }

  async projectSummary(userId: string, projectId: string) {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: { developer: true } });
    if (project.developer.ownerUserId !== userId) throw new ForbiddenException();
    const stats = await this.prisma.projectDailyStat.aggregate({
      where: { projectId },
      _sum: { viewsCount: true, inquiriesCount: true, savesCount: true },
    });
    return { projectId, status: project.status, ...stats._sum };
  }

  async rollupDailyListingStats() {
    return this.rollupListingsForDate(new Date());
  }

  async rollupDailyProjectStats() {
    return this.rollupProjectsForDate(new Date());
  }

  async record(input: {
    eventType: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    sessionId?: string;
    anonymousId?: string;
    idempotencyKey?: string;
    metadataJson?: Record<string, unknown>;
    occurredAt?: string;
  }) {
    const data = {
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      sessionId: input.sessionId,
      anonymousId: input.anonymousId,
      idempotencyKey: input.idempotencyKey,
      metadataJson: input.metadataJson as Prisma.InputJsonValue | undefined,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    };
    if (input.idempotencyKey) {
      const existing = await this.prisma.analyticsEvent.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return existing;
    }
    const event = await this.prisma.analyticsEvent.create({ data });
    await this.applyRealtimeStats(event);
    return event;
  }

  async popular(entityType: string, input: { purpose?: string; period?: string; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 6, 1), 20);
    const period = this.popularPeriod(input.period);
    if (entityType === 'listing') return this.popularListings(input.purpose, limit, period);
    if (entityType === 'project') return this.popularProjects(limit, period);
    return { entityType, total: 0, items: [] };
  }

  async entityStats(entityType: string, entityId: string) {
    if (entityType === 'listing') {
      const [stats, favoritesCount, listing] = await Promise.all([
        this.prisma.listingDailyStat.aggregate({
          where: { listingId: entityId },
          _sum: { viewsCount: true, uniqueViewsCount: true, savesCount: true, inquiriesCount: true, chatsStartedCount: true },
        }),
        this.prisma.favorite.count({ where: { entityType: 'listing', entityId } }),
        this.prisma.listing.findUnique({ where: { id: entityId }, select: { inquiryCount: true, viewCount: true } }),
      ]);
      return {
        entityType,
        entityId,
        viewsCount: stats._sum.viewsCount ?? listing?.viewCount ?? 0,
        uniqueViewsCount: stats._sum.uniqueViewsCount ?? 0,
        favoritesCount,
        savesCount: stats._sum.savesCount ?? favoritesCount,
        inquiriesCount: listing?.inquiryCount ?? stats._sum.inquiriesCount ?? 0,
        chatsStartedCount: stats._sum.chatsStartedCount ?? 0,
      };
    }

    if (entityType === 'project') {
      const [stats, favoritesCount] = await Promise.all([
        this.prisma.projectDailyStat.aggregate({
          where: { projectId: entityId },
          _sum: { viewsCount: true, savesCount: true, inquiriesCount: true },
        }),
        this.prisma.favorite.count({ where: { entityType: 'project', entityId } }),
      ]);
      return {
        entityType,
        entityId,
        viewsCount: stats._sum.viewsCount ?? 0,
        favoritesCount,
        savesCount: stats._sum.savesCount ?? favoritesCount,
        inquiriesCount: stats._sum.inquiriesCount ?? 0,
      };
    }

    const [viewsCount, favoritesCount] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { entityType, entityId, eventType: `${entityType}_viewed` } }),
      this.prisma.favorite.count({ where: { entityType, entityId } }),
    ]);
    return { entityType, entityId, viewsCount, favoritesCount };
  }

  async rollupListingsForDate(date: Date) {
    const day = this.dayStart(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        entityType: 'listing',
        occurredAt: { gte: day, lt: next },
        eventType: { in: ['listing_viewed', 'listing_favorited', 'inquiry_created', 'chat_started'] },
      },
    });
    const grouped = new Map<string, { views: number; unique: Set<string>; saves: number; inquiries: number; chats: number }>();
    for (const event of events) {
      if (!event.entityId) continue;
      const row = grouped.get(event.entityId) ?? { views: 0, unique: new Set<string>(), saves: 0, inquiries: 0, chats: 0 };
      if (event.eventType === 'listing_viewed') {
        row.views += 1;
        if (event.userId ?? event.sessionId ?? event.anonymousId) row.unique.add(event.userId ?? event.sessionId ?? event.anonymousId ?? '');
      }
      if (event.eventType === 'listing_favorited') row.saves += 1;
      if (event.eventType === 'inquiry_created') row.inquiries += 1;
      if (event.eventType === 'chat_started') row.chats += 1;
      grouped.set(event.entityId, row);
    }
    for (const [listingId, row] of grouped) {
      await this.prisma.listingDailyStat.upsert({
        where: { listingId_statDate: { listingId, statDate: day } },
        update: { viewsCount: row.views, uniqueViewsCount: row.unique.size, savesCount: row.saves, inquiriesCount: row.inquiries, chatsStartedCount: row.chats },
        create: { listingId, statDate: day, viewsCount: row.views, uniqueViewsCount: row.unique.size, savesCount: row.saves, inquiriesCount: row.inquiries, chatsStartedCount: row.chats },
      });
    }
    return { rolledUp: grouped.size, statDate: day };
  }

  async rollupProjectsForDate(date: Date) {
    const day = this.dayStart(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        entityType: 'project',
        occurredAt: { gte: day, lt: next },
        eventType: { in: ['project_viewed', 'project_favorited', 'inquiry_created'] },
      },
    });
    const grouped = new Map<string, { views: number; saves: number; inquiries: number }>();
    for (const event of events) {
      if (!event.entityId) continue;
      const row = grouped.get(event.entityId) ?? { views: 0, saves: 0, inquiries: 0 };
      if (event.eventType === 'project_viewed') row.views += 1;
      if (event.eventType === 'project_favorited') row.saves += 1;
      if (event.eventType === 'inquiry_created') row.inquiries += 1;
      grouped.set(event.entityId, row);
    }
    for (const [projectId, row] of grouped) {
      await this.prisma.projectDailyStat.upsert({
        where: { projectId_statDate: { projectId, statDate: day } },
        update: { viewsCount: row.views, savesCount: row.saves, inquiriesCount: row.inquiries },
        create: { projectId, statDate: day, viewsCount: row.views, savesCount: row.saves, inquiriesCount: row.inquiries },
      });
    }
    return { rolledUp: grouped.size, statDate: day };
  }

  private dayStart(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private async applyRealtimeStats(event: { eventType: string; entityType: string | null; entityId: string | null; occurredAt: Date; userId: string | null; sessionId: string | null; anonymousId: string | null }) {
    if (!event.entityId) return;
    const day = this.dayStart(event.occurredAt);
    const uniqueIncrement = event.userId ?? event.sessionId ?? event.anonymousId ? 1 : 0;

    if (event.eventType === 'listing_viewed') {
      await this.prisma.$transaction([
        this.prisma.listing.updateMany({ where: { id: event.entityId }, data: { viewCount: { increment: 1 } } }),
        this.prisma.listingDailyStat.upsert({
          where: { listingId_statDate: { listingId: event.entityId, statDate: day } },
          update: { viewsCount: { increment: 1 }, uniqueViewsCount: { increment: uniqueIncrement } },
          create: { listingId: event.entityId, statDate: day, viewsCount: 1, uniqueViewsCount: uniqueIncrement },
        }),
      ]);
      return;
    }

    if (event.eventType === 'project_viewed') {
      await this.prisma.projectDailyStat.upsert({
        where: { projectId_statDate: { projectId: event.entityId, statDate: day } },
        update: { viewsCount: { increment: 1 } },
        create: { projectId: event.entityId, statDate: day, viewsCount: 1 },
      });
      return;
    }

    if (event.eventType === 'listing_favorited') {
      await this.prisma.listingDailyStat.upsert({
        where: { listingId_statDate: { listingId: event.entityId, statDate: day } },
        update: { savesCount: { increment: 1 } },
        create: { listingId: event.entityId, statDate: day, savesCount: 1 },
      });
      return;
    }

    if (event.eventType === 'project_favorited') {
      await this.prisma.projectDailyStat.upsert({
        where: { projectId_statDate: { projectId: event.entityId, statDate: day } },
        update: { savesCount: { increment: 1 } },
        create: { projectId: event.entityId, statDate: day, savesCount: 1 },
      });
    }
  }

  private async popularListings(purpose: string | undefined, limit: number, period: { from?: Date; to?: Date }) {
    const rows = await this.prisma.listingDailyStat.groupBy({
      by: ['listingId'],
      where: period.from && period.to ? { statDate: { gte: period.from, lt: period.to } } : undefined,
      _sum: { viewsCount: true, savesCount: true },
      orderBy: { _sum: { viewsCount: 'desc' } },
      take: limit * 2,
    });
    if (!rows.length) return { entityType: 'listing', total: 0, items: [] };
    const listings = await this.prisma.listing.findMany({
      where: {
        id: { in: rows.map((row) => row.listingId) },
        status: 'active',
        deletedAt: null,
        ...(purpose ? { purpose: { code: purpose === 'buy' ? 'sale' : purpose } } : {}),
      },
      include: {
        city: true,
        area: true,
        purpose: true,
        propertyType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      },
    });
    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    const items = rows
      .map((row) => {
        const listing = byId.get(row.listingId);
        if (!listing) return null;
        return {
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
          stats: { viewsCount: row._sum.viewsCount ?? 0, favoritesCount: row._sum.savesCount ?? 0 },
        };
      })
      .filter(Boolean)
      .slice(0, limit);
    return { entityType: 'listing', total: items.length, items };
  }

  private async popularProjects(limit: number, period: { from?: Date; to?: Date }) {
    const rows = await this.prisma.projectDailyStat.groupBy({
      by: ['projectId'],
      where: period.from && period.to ? { statDate: { gte: period.from, lt: period.to } } : undefined,
      _sum: { viewsCount: true, savesCount: true },
      orderBy: { _sum: { viewsCount: 'desc' } },
      take: limit * 2,
    });
    if (!rows.length) return { entityType: 'project', total: 0, items: [] };
    const projects = await this.prisma.project.findMany({
      where: { id: { in: rows.map((row) => row.projectId) }, status: 'active', deletedAt: null },
      include: {
        developer: true,
        city: true,
        area: true,
        projectType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      },
    });
    const byId = new Map(projects.map((project) => [project.id, project]));
    const items = rows
      .map((row) => {
        const project = byId.get(row.projectId);
        if (!project) return null;
        return {
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
          stats: { viewsCount: row._sum.viewsCount ?? 0, favoritesCount: row._sum.savesCount ?? 0 },
        };
      })
      .filter(Boolean)
      .slice(0, limit);
    return { entityType: 'project', total: items.length, items };
  }

  private popularPeriod(period?: string) {
    if (period !== 'month') return {};
    const now = new Date();
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      to: now,
    };
  }
}
