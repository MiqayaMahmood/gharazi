import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AdminPromotionGrantDto } from './dto/admin-promotion-grant.dto';
import { findPackage } from '../payments/package-catalog';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly indexing: SearchIndexingService,
  ) {}

  async create(userId: string, dto: CreatePromotionDto) {
    // Paid promotions are created only from the verified payment/entitlement path.
    // This seller endpoint has no trusted payment or admin grant reference.
    void userId;
    void dto;
    throw new ForbiddenException('Promotions must be purchased through the verified checkout flow');
  }

  async grantAdminPromotion(actorUserId: string, dto: AdminPromotionGrantDto) {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 10 || reason.length > 1000) {
      throw new BadRequestException('A grant reason of 10 to 1000 characters is required');
    }
    const selected = findPackage(dto.promotionType);
    if (
      !selected || selected.type !== 'one_time' || selected.requiresEntityType !== 'listing' ||
      !['listing_hot', 'listing_super_hot'].includes(selected.code) || selected.durationDays !== dto.durationDays
    ) {
      throw new BadRequestException('Promotion type and duration must match a supported listing package');
    }

    const existing = await this.prisma.promotion.findUnique({ where: { id: dto.idempotencyKey } });
    if (existing) return this.returnGrantReplay(actorUserId, dto, reason, selected.durationDays, existing);

    const now = new Date();
    const endsAt = new Date(now.getTime() + selected.durationDays * 24 * 60 * 60 * 1000);
    try {
      const promotion = await this.prisma.$transaction(async (tx) => {
        const listing = await tx.listing.findFirst({
          where: { id: dto.listingId, status: 'active', publishedAt: { not: null }, deletedAt: null },
          select: { id: true, ownerUserId: true },
        });
        if (!listing) throw new BadRequestException('Promotion target must be a published, active listing');

        const granted = await tx.promotion.create({
          data: {
            id: dto.idempotencyKey,
            entityType: 'listing',
            entityId: listing.id,
            promotionType: selected.code,
            startsAt: now,
            endsAt,
            status: 'active',
            purchasedByUserId: listing.ownerUserId,
            notes: reason,
            packageCode: null,
            paymentTransactionId: null,
            isHot: selected.entitlements.includes('listing_hot'),
            isFeatured: selected.entitlements.includes('listing_featured'),
          },
        });

        const updatedListing = await tx.listing.update({
          where: { id: listing.id, status: 'active', publishedAt: { not: null }, deletedAt: null },
          data: {
            ...(selected.entitlements.includes('listing_hot') ? { isHot: true } : {}),
            ...(selected.entitlements.includes('listing_featured') ? { isFeatured: true } : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId,
            action: 'promotion.admin_grant',
            entityType: 'promotion',
            entityId: granted.id,
            metadataJson: {
              idempotencyKey: dto.idempotencyKey,
              listingId: listing.id,
              recipientUserId: listing.ownerUserId,
              promotionType: selected.code,
              durationDays: selected.durationDays,
              reason,
              grantedAt: now.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        return { promotion: granted, listing: updatedListing };
      });

      if (promotion.listing.status === 'active') {
        await this.indexing.indexListing(promotion.listing.id, promotion.listing.publicId);
      }
      return { promotion: promotion.promotion, replayed: false };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const raced = await this.prisma.promotion.findUnique({ where: { id: dto.idempotencyKey } });
        if (raced) return this.returnGrantReplay(actorUserId, dto, reason, selected.durationDays, raced);
      }
      if (this.isRecordNotFound(error)) throw new ConflictException('Listing eligibility changed before the grant completed');
      throw error;
    }
  }

  private async returnGrantReplay(
    actorUserId: string,
    dto: AdminPromotionGrantDto,
    reason: string,
    durationDays: number,
    promotion: any,
  ) {
    const audit = await this.prisma.auditLog.findFirst({
      where: { actorUserId, action: 'promotion.admin_grant', entityType: 'promotion', entityId: promotion.id },
      select: { metadataJson: true },
    });
    const metadata = audit?.metadataJson as Record<string, unknown> | null | undefined;
    const sameRequest =
      promotion.id === dto.idempotencyKey && promotion.paymentTransactionId == null &&
      promotion.entityType === 'listing' && promotion.entityId === dto.listingId &&
      promotion.promotionType === dto.promotionType &&
      promotion.endsAt instanceof Date && promotion.startsAt instanceof Date &&
      promotion.endsAt.getTime() - promotion.startsAt.getTime() === durationDays * 24 * 60 * 60 * 1000 &&
      metadata?.idempotencyKey === dto.idempotencyKey && metadata?.durationDays === durationDays &&
      metadata?.reason === reason && metadata?.listingId === dto.listingId && metadata?.promotionType === dto.promotionType;
    if (!sameRequest) throw new ConflictException('Idempotency key was already used for a different operation');
    return { promotion, replayed: true };
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private isRecordNotFound(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
  }

  async update(userId: string, id: string, dto: UpdatePromotionDto) {
    const promotion = await this.assertOwner(userId, id);
    const mutableFields = new Set(['notes']);
    if (Object.keys(dto).some((field) => !mutableFields.has(field))) {
      throw new BadRequestException('Only promotion notes can be changed');
    }
    const updated = await this.prisma.promotion.update({
      where: { id },
      data: { notes: dto.notes },
    });
    await this.audit.record({ actorUserId: userId, action: 'promotion.update', entityType: 'promotion', entityId: id, metadataJson: { previousStatus: promotion.status } });
    return updated;
  }

  mine(userId: string) {
    return this.prisma.promotion.findMany({ where: { purchasedByUserId: userId }, orderBy: { createdAt: 'desc' } });
  }

  async cancel(userId: string, id: string) {
    const promotion = await this.assertOwner(userId, id);
    const updated = await this.prisma.promotion.update({ where: { id }, data: { status: 'canceled' } });
    await this.recomputeEntityFlags(promotion.entityType, promotion.entityId);
    await this.audit.record({ actorUserId: userId, action: 'promotion.cancel', entityType: 'promotion', entityId: id });
    return updated;
  }

  async endExpiredPromotions() {
    const expired = await this.prisma.promotion.findMany({ where: { status: 'active', endsAt: { lte: new Date() } } });
    for (const promotion of expired) {
      await this.prisma.promotion.update({ where: { id: promotion.id }, data: { status: 'ended' } });
      await this.recomputeEntityFlags(promotion.entityType, promotion.entityId);
      await this.notifications.create({ userId: promotion.purchasedByUserId, notificationType: 'promotion_ended', title: 'Promotion ended', payloadJson: { promotionId: promotion.id }, queueDelivery: true });
    }
    return { ended: expired.length };
  }

  private async recomputeEntityFlags(entityType: string, entityId: string) {
    const active = await this.prisma.promotion.findMany({ where: { entityType, entityId, status: 'active', endsAt: { gt: new Date() } } });
    const isFeatured = active.some((item) => item.isFeatured || item.promotionType.includes('featured') || item.promotionType === 'listing_super_hot');
    const isHot = active.some((item) => item.isHot || item.promotionType === 'listing_hot' || item.promotionType === 'listing_super_hot');
    if (entityType === 'listing') {
      const listing = await this.prisma.listing.update({ where: { id: entityId }, data: { isFeatured, isHot } });
      if (listing.status === 'active') await this.indexing.indexListing(listing.id, listing.publicId);
    } else if (entityType === 'project') {
      const project = await this.prisma.project.update({ where: { id: entityId }, data: { isFeatured } });
      if (project.status === 'active') await this.indexing.indexProject(project.id, project.publicId);
    }
  }

  private async assertOwner(userId: string, id: string) {
    const promotion = await this.prisma.promotion.findFirst({ where: { id, purchasedByUserId: userId } });
    if (!promotion) throw new NotFoundException('Promotion was not found');
    return promotion;
  }

}
