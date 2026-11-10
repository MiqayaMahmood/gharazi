import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { makePublicId } from '@Gharazi/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { AddListingMediaDto } from './dto/add-listing-media.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { buildWhatsAppUrl } from './whatsapp';

const PUBLIC_LISTING_STATUSES = ['active', 'sold', 'rented'] as const;
const RENEWAL_DAYS = 90;
const RENEWAL_WINDOW_DAYS = 15;
const RENEWAL_COOLDOWN_MS = RENEWAL_DAYS * 24 * 60 * 60 * 1000;
const RENEWAL_WINDOW_MS = RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type ListingRenewalResult = {
  listingId: string;
  previousExpiresAt: string;
  newExpiresAt: string;
  renewalTimestamp: string;
  replayed: boolean;
};

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexing: SearchIndexingService,
  ) {}

  async create(userId: string, dto: CreateListingDto) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`POST /listings create requested userId=${userId} cityId=${dto.cityId} areaId=${dto.areaId} purposeId=${dto.purposeId} propertyTypeId=${dto.propertyTypeId}`);
      }
      const { amenityIds, ...data } = dto;
      const listing = await this.prisma.listing.create({
        data: {
          ...data,
          publicId: await this.uniquePublicId(),
          ownerUserId: userId,
          lastRefreshedAt: new Date(),
          amenities: amenityIds?.length
            ? { create: amenityIds.map((amenityId) => ({ amenityId })) }
            : undefined,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'draft',
              reason: 'Listing created',
              changedByUserId: userId,
            },
          },
        },
        include: this.detailInclude(),
      });

      return listing;
    } catch (error) {
      this.logger.error(`POST /listings create failed userId=${userId}: ${this.errorSummary(error)}`);
      throw error;
    }
  }

  async listMine(userId: string) {
    const listings = await this.prisma.listing.findMany({
      where: {
        deletedAt: null,
        OR: [{ ownerUserId: userId }, { managedByUserId: userId }],
      },
      include: this.detailInclude(),
      orderBy: { updatedAt: 'desc' },
    });
    if (listings.length === 0) return listings;

    const now = new Date();
    const recentRenewals = await this.prisma.auditLog.groupBy({
      by: ['entityId'],
      where: {
        action: 'listing.renewed',
        entityType: 'listing',
        entityId: { in: listings.map((listing) => listing.id) },
        createdAt: { gt: new Date(now.getTime() - RENEWAL_COOLDOWN_MS) },
      },
      _max: { createdAt: true },
    });
    const renewedAtByListing = new Map(
      recentRenewals.flatMap((row) => row.entityId && row._max.createdAt ? [[row.entityId, row._max.createdAt] as const] : []),
    );

    return listings.map((listing) => {
      const expiry = listing.expiresAt;
      if (listing.status !== 'active' || !(expiry instanceof Date) || !Number.isFinite(expiry.getTime())) {
        return { ...listing, renewalEligible: false, renewalAvailableAt: null };
      }
      const earliestByExpiry = Math.max(now.getTime(), expiry.getTime() - RENEWAL_WINDOW_MS);
      const lastRenewal = renewedAtByListing.get(listing.id);
      const earliestByCooldown = lastRenewal ? lastRenewal.getTime() + RENEWAL_COOLDOWN_MS : now.getTime();
      const renewalAvailableAt = new Date(Math.max(earliestByExpiry, earliestByCooldown));
      return {
        ...listing,
        renewalEligible: renewalAvailableAt.getTime() <= now.getTime(),
        renewalAvailableAt,
      };
    });
  }

  async getMine(userId: string, id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        deletedAt: null,
        AND: [{ OR: [{ ownerUserId: userId }, { managedByUserId: userId }] }],
      },
      include: this.detailInclude(),
    });

    if (!listing) {
      throw new NotFoundException('Listing was not found for this account');
    }

    return listing;
  }

  async getPublic(publicId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        publicId,
        deletedAt: null,
        status: { in: [...PUBLIC_LISTING_STATUSES] },
      },
      include: this.detailInclude(),
    });

    if (!listing) {
      throw new NotFoundException('Listing was not found');
    }

    return this.mapPublicListing(listing);
  }

  async batchPublic(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const listings = await this.prisma.listing.findMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
        status: { in: [...PUBLIC_LISTING_STATUSES] },
      },
      include: this.detailInclude(),
    });
    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    return ids.map((id) => byId.get(id)).filter(Boolean).map((listing) => this.mapPublicListing(listing));
  }

  async getContact(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        deletedAt: null,
        status: { in: [...PUBLIC_LISTING_STATUSES] },
      },
      select: {
        contactName: true,
        contactPhone: true,
        contactWhatsapp: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing was not found');
    }

    return {
      contactName: listing.contactName ?? undefined,
      contactPhone: listing.contactPhone ?? undefined,
      whatsappUrl: buildWhatsAppUrl(listing.contactWhatsapp),
    };
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    await this.assertCanWrite(userId, id);
    const { amenityIds, ...data } = dto;

    const listing = await this.prisma.$transaction(async (tx) => {
      if (amenityIds) {
        await tx.listingAmenity.deleteMany({ where: { listingId: id } });
        if (amenityIds.length) {
          await tx.listingAmenity.createMany({
            data: amenityIds.map((amenityId) => ({ listingId: id, amenityId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.listing.update({
        where: { id },
        data,
        include: this.detailInclude(),
      });
    });

    if (listing.status === 'active') {
      await this.indexing.indexListing(listing.id, listing.publicId);
    }

    return listing;
  }

  async publish(userId: string, id: string) {
    const listing = await this.assertCanWrite(userId, id);
    if (listing.status !== 'draft') {
      throw new ConflictException(`A listing in ${listing.status} status cannot be published`);
    }
    this.assertPublishable(listing);

    const updated = await this.transition(userId, id, listing.status, 'active', 'Listing published', {
      publishedAt: listing.publishedAt ?? new Date(),
      expiresAt: listing.expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      lastRefreshedAt: new Date(),
    });
    await this.indexing.indexListing(updated.id, updated.publicId);

    return updated;
  }

  async archive(user: AuthenticatedUser, id: string) {
    const listing = await this.assertCanManage(user, id);
    if (listing.status === 'archived' || listing.status === 'expired') {
      return listing;
    }
    if (!['draft', 'active'].includes(listing.status)) {
      throw new ConflictException(`A listing in ${listing.status} status cannot be archived`);
    }

    const updated = await this.transition(user.id, listing.id, listing.status, 'archived', 'Listing archived');
    await this.indexing.deleteListing(updated.id, updated.publicId);

    return updated;
  }

  async refresh(user: AuthenticatedUser, id: string) {
    const listing = await this.assertCanManage(user, id);
    if (listing.status !== 'active') {
      throw new ConflictException(`A listing in ${listing.status} status cannot be refreshed`);
    }
    let updated;
    try {
      updated = await this.prisma.listing.update({
        where: { id: listing.id, status: 'active' },
        data: { lastRefreshedAt: new Date() },
        include: this.detailInclude(),
      });
    } catch (error) {
      if (this.isRecordNotFound(error)) throw new ConflictException('Listing status changed; refresh was not applied');
      throw error;
    }

    if (listing.status === 'active') {
      await this.indexing.indexListing(updated.id, updated.publicId);
    }

    return updated;
  }

  async renew(user: AuthenticatedUser, id: string, idempotencyKey: string): Promise<ListingRenewalResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const listing = await tx.listing.findFirst({
          where: {
            OR: [{ id }, { publicId: id }],
            deletedAt: null,
            AND: [{ OR: [{ ownerUserId: user.id }, { managedByUserId: user.id }] }],
          },
          select: {
            id: true,
            ownerUserId: true,
            managedByUserId: true,
            status: true,
            expiresAt: true,
            updatedAt: true,
          },
        });

        if (!listing) throw new ForbiddenException('Listing is not available for renewal by this account');

        const replay = await this.findRenewalAudit(tx.auditLog, user.id, listing.id, idempotencyKey);
        if (replay) return replay;

        if (listing.status !== 'active') {
          throw new ConflictException(`A listing in ${listing.status} status cannot be renewed`);
        }
        if (!(listing.expiresAt instanceof Date) || !Number.isFinite(listing.expiresAt.getTime())) {
          throw new ConflictException('A listing without a valid expiry date cannot be renewed');
        }

        const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`;
        if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
          throw new Error('Database renewal timestamp is unavailable');
        }

        const earliestRenewal = listing.expiresAt.getTime() - RENEWAL_WINDOW_MS;
        if (now.getTime() < earliestRenewal) {
          throw new ConflictException('Renewal is available only during the 15 days before expiry or after expiry');
        }

        const cooldownBoundary = new Date(now.getTime() - RENEWAL_COOLDOWN_MS);
        const recentRenewal = await tx.auditLog.findFirst({
          where: {
            action: 'listing.renewed',
            entityType: 'listing',
            entityId: listing.id,
            createdAt: { gt: cooldownBoundary },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        if (recentRenewal) {
          const renewalAvailableAt = new Date(recentRenewal.createdAt.getTime() + RENEWAL_COOLDOWN_MS);
          throw new ConflictException(`This listing was renewed recently; try again after ${renewalAvailableAt.toISOString()}`);
        }

        const newExpiresAt = new Date(Math.max(listing.expiresAt.getTime(), now.getTime()) + RENEWAL_COOLDOWN_MS);
        const updated = await tx.listing.updateMany({
          where: {
            id: listing.id,
            ownerUserId: listing.ownerUserId,
            managedByUserId: listing.managedByUserId,
            status: 'active',
            deletedAt: null,
            expiresAt: listing.expiresAt,
            AND: [{ OR: [{ ownerUserId: user.id }, { managedByUserId: user.id }] }],
          },
          // Preserve updatedAt so renewal does not alter PostgreSQL fallback sort behavior.
          data: { expiresAt: newExpiresAt, updatedAt: listing.updatedAt },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Listing changed during renewal; retry with the same idempotency key');
        }

        const metadata = {
          idempotencyKey,
          previousExpiresAt: listing.expiresAt.toISOString(),
          newExpiresAt: newExpiresAt.toISOString(),
          renewalTimestamp: now.toISOString(),
          renewalSource: 'seller_dashboard',
          durationDays: RENEWAL_DAYS,
        };
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'listing.renewed',
            entityType: 'listing',
            entityId: listing.id,
            metadataJson: metadata as Prisma.InputJsonValue,
            createdAt: now,
          },
        });

        return {
          listingId: listing.id,
          previousExpiresAt: metadata.previousExpiresAt,
          newExpiresAt: metadata.newExpiresAt,
          renewalTimestamp: metadata.renewalTimestamp,
          replayed: false,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      // A competing request with the same key may have committed while this transaction lost its CAS.
      const authorizedListing = await this.prisma.listing.findFirst({
        where: {
          OR: [{ id }, { publicId: id }],
          deletedAt: null,
          AND: [{ OR: [{ ownerUserId: user.id }, { managedByUserId: user.id }] }],
        },
        select: { id: true },
      });
      if (authorizedListing) {
        const replay = await this.findRenewalAudit(this.prisma.auditLog, user.id, authorizedListing.id, idempotencyKey);
        if (replay) return replay;
      }
      if (this.isSerializationFailure(error)) {
        throw new ConflictException('A concurrent renewal changed this listing; retry with the same idempotency key');
      }
      throw error;
    }
  }

  async markStatus(user: AuthenticatedUser, id: string, status: 'sold' | 'rented') {
    const listing = await this.assertCanManage(user, id);
    if (listing.status !== 'active') {
      throw new ConflictException(`A listing in ${listing.status} status cannot be marked ${status}`);
    }
    const updated = await this.transition(user.id, listing.id, listing.status, status, `Listing marked ${status}`);
    await this.indexing.indexListing(updated.id, updated.publicId);
    return updated;
  }

  async viewerContext(user: AuthenticatedUser, id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id }, { publicId: id }], deletedAt: null },
      select: { id: true, ownerUserId: true, managedByUserId: true, status: true },
    });
    if (!listing) throw new NotFoundException('Listing was not found');
    const isOwner = listing.ownerUserId === user.id;
    const isManager = listing.managedByUserId === user.id;
    const admin = this.isAdminOrModerator(user);
    const canManage = isOwner || isManager || admin;
    return {
      isOwner,
      isManager,
      isAdmin: admin,
      canManage,
      canContact: !canManage && listing.status === 'active',
      canFavorite: !canManage && listing.status === 'active',
      canEdit: canManage,
      canArchive: canManage,
      canRefresh: canManage,
      canMarkSoldOrRented: canManage && ['active', 'draft'].includes(listing.status),
    };
  }

  async ownerSummary(user: AuthenticatedUser, id: string) {
    const listing = await this.assertCanManage(user, id);
    const [daily, favoritesCount, inquiriesCount, chatsCount, messagesCount] = await Promise.all([
      this.prisma.listingDailyStat.aggregate({
        where: { listingId: listing.id },
        _sum: {
          viewsCount: true,
          uniqueViewsCount: true,
          savesCount: true,
          inquiriesCount: true,
          chatsStartedCount: true,
        },
      }),
      this.prisma.favorite.count({ where: { entityType: 'listing', entityId: listing.id } }),
      this.prisma.inquiry.count({ where: { listingId: listing.id } }),
      this.prisma.chat.count({ where: { listingId: listing.id } }),
      this.prisma.chatMessage.count({ where: { chat: { listingId: listing.id } } }),
    ]);
    return {
      listingId: listing.id,
      status: listing.status,
      views: daily._sum.viewsCount ?? listing.viewCount ?? 0,
      uniqueViews: daily._sum.uniqueViewsCount ?? 0,
      favorites: daily._sum.savesCount ?? favoritesCount,
      inquiries: daily._sum.inquiriesCount ?? inquiriesCount,
      chats: daily._sum.chatsStartedCount ?? chatsCount,
      messages: messagesCount,
      lastRefreshedAt: listing.lastRefreshedAt,
      publishedAt: listing.publishedAt,
      searchVisibility: listing.status === 'active' ? 'Public search' : 'Not public',
    };
  }

  async addMedia(userId: string, id: string, dto: AddListingMediaDto) {
    await this.assertCanWrite(userId, id);
    const media = await this.prisma.listingMedia.create({
      data: {
        listingId: id,
        ...dto,
      },
    });
    const listing = await this.prisma.listing.findUniqueOrThrow({ where: { id } });
    if (listing.status === 'active') {
      await this.indexing.indexListing(listing.id, listing.publicId);
    }

    return media;
  }

  private async assertCanWrite(userId: string, id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        deletedAt: null,
        AND: [{ OR: [{ ownerUserId: userId }, { managedByUserId: userId }] }],
      },
    });

    if (!listing) {
      throw new ForbiddenException('Listing is not available for this user');
    }

    return listing;
  }

  private async assertCanManage(user: Pick<AuthenticatedUser, 'id' | 'roles'>, id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        deletedAt: null,
        ...(this.isAdminOrModerator(user) ? {} : { AND: [{ OR: [{ ownerUserId: user.id }, { managedByUserId: user.id }] }] }),
      },
    });

    if (!listing) {
      throw new ForbiddenException('Listing is not available for this user');
    }

    return listing;
  }

  private isAdminOrModerator(user: Pick<AuthenticatedUser, 'roles'>) {
    return (user.roles ?? []).some((role) => ['admin', 'moderator'].includes(role.toLowerCase()));
  }

  private assertPublishable(listing: { title: string; description: string; priceAmount: unknown; areaValue: unknown }) {
    if (!listing.title || !listing.description || !listing.priceAmount || !listing.areaValue) {
      throw new UnprocessableEntityException('Listing is missing required publish fields');
    }
  }

  private async transition(
    userId: string,
    id: string,
    fromStatus: string,
    toStatus: string,
    reason: string,
    extraData: Record<string, unknown> = {},
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const listing = await tx.listing.update({
          where: { id, status: fromStatus },
          data: { status: toStatus, ...extraData },
          include: this.detailInclude(),
        });
        await tx.listingStatusHistory.create({
          data: {
            listingId: id,
            fromStatus,
            toStatus,
            reason,
            changedByUserId: userId,
          },
        });

        return listing;
      });
    } catch (error) {
      if (this.isRecordNotFound(error)) throw new ConflictException('Listing status changed; transition was not applied');
      throw error;
    }
  }

  private isRecordNotFound(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
  }

  private async findRenewalAudit(
    auditLog: Prisma.TransactionClient['auditLog'],
    actorUserId: string,
    listingId: string,
    idempotencyKey: string,
  ): Promise<ListingRenewalResult | null> {
    const audit = await auditLog.findFirst({
      where: {
        actorUserId,
        action: 'listing.renewed',
        entityType: 'listing',
        entityId: listingId,
        metadataJson: { path: ['idempotencyKey'], equals: idempotencyKey },
      },
      select: { metadataJson: true },
    });
    const metadata = audit?.metadataJson as Record<string, unknown> | null | undefined;
    if (!metadata) return null;
    if (
      typeof metadata.previousExpiresAt !== 'string' ||
      typeof metadata.newExpiresAt !== 'string' ||
      typeof metadata.renewalTimestamp !== 'string' ||
      metadata.renewalSource !== 'seller_dashboard' ||
      metadata.durationDays !== RENEWAL_DAYS
    ) {
      throw new ConflictException('Idempotency key matches an incompatible renewal record');
    }
    return {
      listingId,
      previousExpiresAt: metadata.previousExpiresAt,
      newExpiresAt: metadata.newExpiresAt,
      renewalTimestamp: metadata.renewalTimestamp,
      replayed: true,
    };
  }

  private isSerializationFailure(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
  }

  private async uniquePublicId(): Promise<string> {
    while (true) {
      const publicId = makePublicId('LST');
      const existing = await this.prisma.listing.findUnique({ where: { publicId } });
      if (!existing) {
        return publicId;
      }
    }
  }

  private detailInclude() {
    return {
      purpose: true,
      propertyType: true,
      city: true,
      area: true,
      media: { orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }] },
      amenities: { include: { amenity: true } },
      statusHistory: { orderBy: { createdAt: 'desc' as const }, take: 10 },
    };
  }

  private mapPublicListing(listing: any) {
    return {
      id: listing.id,
      publicId: listing.publicId,
      purposeId: listing.purposeId,
      propertyTypeId: listing.propertyTypeId,
      cityId: listing.cityId,
      areaId: listing.areaId,
      title: listing.title,
      description: listing.description,
      priceAmount: listing.priceAmount,
      priceCurrency: listing.priceCurrency,
      areaValue: listing.areaValue,
      areaUnit: listing.areaUnit,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      floorNumber: listing.floorNumber,
      totalFloors: listing.totalFloors,
      yearBuilt: listing.yearBuilt,
      furnishedStatus: listing.furnishedStatus,
      possessionStatus: listing.possessionStatus,
      latitude: listing.latitude,
      longitude: listing.longitude,
      locationPrecision: listing.locationPrecision,
      status: listing.status,
      verificationStatus: listing.verificationStatus,
      isFeatured: listing.isFeatured,
      isHot: listing.isHot,
      publishedAt: listing.publishedAt,
      expiresAt: listing.expiresAt,
      lastRefreshedAt: listing.lastRefreshedAt,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      purpose: listing.purpose,
      propertyType: listing.propertyType,
      city: listing.city,
      area: listing.area,
      media: listing.media,
      amenities: listing.amenities,
      listerRole: 'Owner/agent',
    };
  }

  private errorSummary(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
