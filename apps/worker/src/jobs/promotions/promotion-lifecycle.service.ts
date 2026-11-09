import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient, type PaymentTransaction, type Promotion } from '@prisma/client';
import { findPackage } from '../../../../api/src/modules/payments/package-catalog';
import { PROMOTION_LIFECYCLE_PRISMA } from './promotion-lifecycle.constants';
import { PromotionActivationDeliveryService } from './promotion-activation-delivery.service';

const MAX_DUE_PER_RUN = 100;

@Injectable()
export class PromotionLifecycleService implements OnModuleDestroy {
  private readonly logger = new Logger(PromotionLifecycleService.name);

  constructor(
    @Inject(PROMOTION_LIFECYCLE_PRISMA) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
    private readonly delivery: PromotionActivationDeliveryService,
  ) {}

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  async activateDuePromotions(now = new Date()) {
    if (this.config.get<boolean>('PROMOTION_ACTIVATION_ENABLED') !== true) {
      this.logger.warn('Scheduled promotion activation is disabled by PROMOTION_ACTIVATION_ENABLED');
      return { disabled: true, activated: 0, dispatched: 0 };
    }

    // Missing migration fails before any activation or delivery mutation.
    await this.prisma.promotionActivationOutbox.findFirst({ select: { id: true } });
    const due = await this.prisma.promotion.findMany({
      where: { status: 'scheduled', startsAt: { lte: now }, endsAt: { gt: now } },
      select: { id: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: MAX_DUE_PER_RUN,
    });
    let activated = 0;
    let activationFailure: unknown;

    for (const candidate of due) {
      try {
        if (await this.activateOne(candidate.id, now)) activated += 1;
      } catch (error) {
        activationFailure ??= error;
        this.logger.error({
          action: 'promotion.activation.transition_failed',
          promotionId: candidate.id,
          errorType: error instanceof Error ? error.name : 'unknown',
        });
      }
    }

    const dispatch = await this.delivery.dispatchPending(now);
    if (activationFailure) throw activationFailure;
    return { disabled: false, activated, dispatched: dispatch.dispatched };
  }

  private async activateOne(promotionId: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.findUnique({ where: { id: promotionId } });
      if (!promotion || promotion.status !== 'scheduled' || promotion.startsAt > now || promotion.endsAt <= now) return false;
      if (!promotion.paymentTransactionId || !promotion.packageCode) return false;

      const payment = await tx.paymentTransaction.findUnique({ where: { id: promotion.paymentTransactionId } });
      if (!payment || !this.isVerifiedPayment(promotion, payment) || !payment.paidAt || payment.paidAt > now) return false;
      if (!payment.packageCode) return false;
      const selected = findPackage(payment.packageCode);
      if (!selected || !selected.active || selected.type !== 'one_time' || selected.requiresEntityType !== promotion.entityType) return false;
      if (promotion.promotionType !== selected.code) return false;
      if (selected.durationDays === undefined || promotion.endsAt.getTime() - promotion.startsAt.getTime() !== selected.durationDays * 86_400_000) return false;
      if (Number(payment.amount) !== selected.amount) return false;
      const expectedCurrency = (this.config.get<string>('STRIPE_CURRENCY') ?? 'pkr').toUpperCase();
      if (payment.currency.toUpperCase() !== expectedCurrency) return false;
      if (promotion.isHot !== selected.entitlements.includes('listing_hot')) return false;
      const hasFeaturedEntitlement = selected.entitlements.some((entitlement) => entitlement.includes('featured'));
      if (promotion.isFeatured !== hasFeaturedEntitlement) return false;

      const target = await this.findEligibleTarget(tx, promotion.entityType, promotion.entityId, payment.userId, now);
      if (!target) return false;

      const claimed = await tx.promotion.updateMany({
        where: { id: promotion.id, status: 'scheduled', startsAt: { lte: now }, endsAt: { gt: now } },
        data: { status: 'active' },
      });
      if (claimed.count !== 1) return false;

      const activePromotions = await tx.promotion.findMany({
        where: { entityType: promotion.entityType, entityId: promotion.entityId, status: 'active', endsAt: { gt: now } },
        select: { promotionType: true, isHot: true, isFeatured: true },
      });
      const isHot = activePromotions.some((item) => item.isHot || item.promotionType === 'listing_hot' || item.promotionType === 'listing_super_hot');
      const isFeatured = activePromotions.some((item) => item.isFeatured || item.promotionType.includes('featured') || item.promotionType === 'listing_super_hot');

      if (promotion.entityType === 'listing') {
        const updated = await tx.listing.updateMany({
          where: {
            id: promotion.entityId,
            status: 'active',
            publishedAt: { not: null },
            deletedAt: null,
            AND: [
              { OR: [{ ownerUserId: payment.userId }, { managedByUserId: payment.userId }] },
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
          },
          data: { isHot, isFeatured },
        });
        if (updated.count !== 1) throw new Error('Listing eligibility changed during scheduled promotion activation');
      } else {
        const updated = await tx.project.updateMany({
          where: { id: promotion.entityId, status: 'active', publishedAt: { not: null }, deletedAt: null, developer: { ownerUserId: payment.userId } },
          data: { isFeatured },
        });
        if (updated.count !== 1) throw new Error('Project eligibility changed during scheduled promotion activation');
      }

      const eventKey = `promotion-activation:${promotion.id}`;
      const event = await tx.promotionActivationOutbox.create({
        data: {
          promotionId: promotion.id,
          eventKey,
          notificationStatus: 'pending',
          searchIndexStatus: 'pending',
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'promotion.activated',
          entityType: 'promotion',
          entityId: promotion.id,
          metadataJson: {
            eventId: event.id,
            eventKey,
            paymentTransactionId: payment.id,
            targetType: promotion.entityType,
            targetId: promotion.entityId,
            promotionType: promotion.promotionType,
          } as Prisma.InputJsonValue,
        },
      });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private isVerifiedPayment(promotion: Promotion, payment: PaymentTransaction) {
    return payment.provider === 'stripe' && payment.status === 'paid' && payment.paidAt !== null &&
      Boolean(payment.stripeCheckoutSessionId || payment.stripePaymentIntentId) &&
      payment.userId === promotion.purchasedByUserId && payment.packageCode === promotion.packageCode &&
      payment.entityType === promotion.entityType && payment.entityId === promotion.entityId;
  }

  private async findEligibleTarget(tx: Prisma.TransactionClient, entityType: string, entityId: string, userId: string, now: Date) {
    if (entityType === 'listing') {
      return tx.listing.findFirst({
        where: {
          id: entityId,
          status: 'active',
          publishedAt: { not: null },
          deletedAt: null,
          OR: [{ ownerUserId: userId }, { managedByUserId: userId }],
          AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        },
        select: { id: true },
      });
    }
    if (entityType === 'project') {
      return tx.project.findFirst({
        where: { id: entityId, status: 'active', publishedAt: { not: null }, deletedAt: null, developer: { ownerUserId: userId } },
        select: { id: true },
      });
    }
    return null;
  }
}
