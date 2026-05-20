import { ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { makePublicId } from '@Gharazi/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { AddListingMediaDto } from './dto/add-listing-media.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const PUBLIC_LISTING_STATUSES = ['active', 'sold', 'rented'] as const;

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

  listMine(userId: string) {
    return this.prisma.listing.findMany({
      where: {
        deletedAt: null,
        OR: [{ ownerUserId: userId }, { managedByUserId: userId }],
      },
      include: this.detailInclude(),
      orderBy: { updatedAt: 'desc' },
    });
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

    return listing;
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
    return ids.map((id) => byId.get(id)).filter(Boolean);
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
    this.assertPublishable(listing);

    const updated = await this.transition(userId, id, listing.status, 'active', 'Listing published', {
      publishedAt: listing.publishedAt ?? new Date(),
      expiresAt: listing.expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      lastRefreshedAt: new Date(),
    });
    await this.indexing.indexListing(updated.id, updated.publicId);

    return updated;
  }

  async archive(userId: string, id: string) {
    const listing = await this.assertCanWrite(userId, id);
    if (['archived', 'expired'].includes(listing.status)) {
      return listing;
    }

    const updated = await this.transition(userId, id, listing.status, 'archived', 'Listing archived');
    await this.indexing.deleteListing(updated.id, updated.publicId);

    return updated;
  }

  async refresh(userId: string, id: string) {
    const listing = await this.assertCanWrite(userId, id);
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { lastRefreshedAt: new Date() },
      include: this.detailInclude(),
    });

    if (listing.status === 'active') {
      await this.indexing.indexListing(updated.id, updated.publicId);
    }

    return updated;
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
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.update({
        where: { id },
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

  private errorSummary(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
