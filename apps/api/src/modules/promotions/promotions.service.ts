import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly indexing: SearchIndexingService,
  ) {}

  async create(userId: string, dto: CreatePromotionDto) {
    await this.assertOwnsEntity(userId, dto.entityType, dto.entityId);
    const promotion = await this.prisma.promotion.create({
      data: {
        ...dto,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        purchasedByUserId: userId,
        status: new Date(dto.startsAt) <= new Date() ? 'active' : 'scheduled',
      },
    });
    if (promotion.status === 'active') await this.applyFeatured(promotion.entityType, promotion.entityId, true);
    await this.audit.record({ actorUserId: userId, action: 'promotion.create', entityType: 'promotion', entityId: promotion.id });
    return promotion;
  }

  async update(userId: string, id: string, dto: UpdatePromotionDto) {
    const promotion = await this.assertOwner(userId, id);
    const updated = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
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
    await this.applyFeatured(promotion.entityType, promotion.entityId, false);
    await this.audit.record({ actorUserId: userId, action: 'promotion.cancel', entityType: 'promotion', entityId: id });
    return updated;
  }

  async activateDuePromotions() {
    const due = await this.prisma.promotion.findMany({ where: { status: 'scheduled', startsAt: { lte: new Date() } } });
    for (const promotion of due) {
      await this.prisma.promotion.update({ where: { id: promotion.id }, data: { status: 'active' } });
      await this.applyFeatured(promotion.entityType, promotion.entityId, true);
      await this.notifications.create({ userId: promotion.purchasedByUserId, notificationType: 'promotion_activated', title: 'Promotion activated', payloadJson: { promotionId: promotion.id }, queueDelivery: true });
    }
    return { activated: due.length };
  }

  async endExpiredPromotions() {
    const expired = await this.prisma.promotion.findMany({ where: { status: 'active', endsAt: { lte: new Date() } } });
    for (const promotion of expired) {
      await this.prisma.promotion.update({ where: { id: promotion.id }, data: { status: 'ended' } });
      await this.applyFeatured(promotion.entityType, promotion.entityId, false);
      await this.notifications.create({ userId: promotion.purchasedByUserId, notificationType: 'promotion_ended', title: 'Promotion ended', payloadJson: { promotionId: promotion.id }, queueDelivery: true });
    }
    return { ended: expired.length };
  }

  private async assertOwner(userId: string, id: string) {
    const promotion = await this.prisma.promotion.findFirst({ where: { id, purchasedByUserId: userId } });
    if (!promotion) throw new NotFoundException('Promotion was not found');
    return promotion;
  }

  private async assertOwnsEntity(userId: string, entityType: string, entityId: string) {
    const owns =
      entityType === 'listing'
        ? await this.prisma.listing.findFirst({ where: { id: entityId, ownerUserId: userId } })
        : await this.prisma.project.findFirst({ where: { id: entityId, developer: { ownerUserId: userId } } });
    if (!owns) throw new ForbiddenException('Promotion target is not available for this user');
  }

  private async applyFeatured(entityType: string, entityId: string, isFeatured: boolean) {
    if (entityType === 'listing') {
      const listing = await this.prisma.listing.update({ where: { id: entityId }, data: { isFeatured } });
      if (listing.status === 'active') await this.indexing.indexListing(listing.id, listing.publicId);
      return;
    }
    const project = await this.prisma.project.update({ where: { id: entityId }, data: { isFeatured } });
    if (project.status === 'active') await this.indexing.indexProject(project.id, project.publicId);
  }
}
