import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CheckoutDto } from './dto/checkout.dto';
import { findPackage, getPackageCatalog, MonetizationPackage } from './package-catalog';
import { SystemEventsService } from '../system-events/system-events.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe?: Stripe;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly systemEvents: SystemEventsService) {
    if (process.env.STRIPE_SECRET_KEY) this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  packages() {
    return getPackageCatalog().map(({ stripePriceId, ...item }) => ({ ...item, selfService: Boolean(stripePriceId) }));
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const stripe = this.requireStripe();
    const selected = findPackage(dto.packageCode);
    if (!selected?.active) throw new NotFoundException('Payment package was not found');
    if (!selected.stripePriceId) throw new ServiceUnavailableException('This package is not configured for self-service checkout');
    const entityId = await this.validateTarget(userId, selected, dto.entityType, dto.entityId);
    const currency = (process.env.STRIPE_CURRENCY ?? 'pkr').toUpperCase();
    const transaction = await this.prisma.paymentTransaction.create({
      data: { userId, provider: 'stripe', packageCode: selected.code, entityType: selected.requiresEntityType, entityId, amount: selected.amount, currency, metadataJson: { packageCode: selected.code, entitlements: selected.entitlements } },
    });
    const metadata = { userId, paymentTransactionId: transaction.id, packageCode: selected.code, entityType: selected.requiresEntityType, entityId: entityId ?? '' };
    try {
      const session = await stripe.checkout.sessions.create({
        mode: selected.type === 'subscription' ? 'subscription' : 'payment',
        line_items: [{ price: selected.stripePriceId, quantity: 1 }],
        success_url: `${process.env.STRIPE_SUCCESS_URL ?? `${process.env.APP_PUBLIC_URL ?? 'http://localhost:3000'}/payment/success`}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: process.env.STRIPE_CANCEL_URL ?? `${process.env.APP_PUBLIC_URL ?? 'http://localhost:3000'}/payment/cancel`,
        client_reference_id: transaction.id,
        metadata,
        payment_intent_data: selected.type === 'one_time' ? { metadata } : undefined,
        subscription_data: selected.type === 'subscription' ? { metadata } : undefined,
      });
      if (!session.url) throw new Error('Stripe did not return a Checkout URL');
      await this.prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { providerReference: session.id, stripeCheckoutSessionId: session.id } });
      await this.audit.record({ actorUserId: userId, action: 'payment.checkout', entityType: 'payment_transaction', entityId: transaction.id, metadataJson: { packageCode: selected.code } });
      this.logger.log({ action: 'stripe.checkout.created', userId, entityType: selected.requiresEntityType, entityId, transactionId: transaction.id, sessionId: session.id, packageCode: selected.code });
      return { checkoutUrl: session.url, sessionId: session.id, transactionId: transaction.id };
    } catch (error) {
      await this.prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { status: 'failed' } });
      throw error;
    }
  }

  constructEvent(rawBody: Buffer, signature: string) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new ServiceUnavailableException('Stripe webhook is not configured');
    try { return this.requireStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET); }
    catch (error) { this.logger.warn({ action: 'stripe.webhook.signature_failed', error: error instanceof Error ? error.message : String(error) }); void this.systemEvents.record({ severity: 'warn', source: 'stripe', message: 'Stripe webhook signature verification failed' }); throw error; }
  }

  async handleStripeEvent(event: Stripe.Event) {
    const started = Date.now(); this.logger.log({ action: 'stripe.webhook.received', eventType: event.type, eventId: event.id });
    let result: unknown;
    switch (event.type) {
      case 'checkout.session.completed': result = await this.checkoutCompleted(event.data.object); break;
      case 'checkout.session.expired': result = await this.updateCheckoutStatus(event.data.object, 'canceled'); break;
      case 'payment_intent.succeeded': result = await this.paymentIntentStatus(event.data.object, 'paid'); break;
      case 'payment_intent.payment_failed': result = await this.paymentIntentStatus(event.data.object, 'failed'); break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': result = await this.syncSubscription(event.data.object); break;
      case 'invoice.paid': result = await this.invoiceStatus(event.data.object, true); break;
      case 'invoice.payment_failed': result = await this.invoiceStatus(event.data.object, false); break;
      default: result = { received: true, handled: false };
    }
    const durationMs = Date.now() - started; const level = durationMs > 2000 ? 'warn' : 'log'; this.logger[level]({ action: durationMs > 2000 ? 'stripe.webhook.slow' : 'stripe.webhook.completed', eventType: event.type, eventId: event.id, durationMs }); return result;
  }

  mine(userId: string) { return this.prisma.paymentTransaction.findMany({ where: { userId }, include: { attempts: true }, orderBy: { createdAt: 'desc' } }); }
  getBySession(userId: string, sessionId: string) { return this.prisma.paymentTransaction.findFirst({ where: { userId, stripeCheckoutSessionId: sessionId } }); }
  async getMine(userId: string, id: string) { return this.prisma.paymentTransaction.findFirstOrThrow({ where: { id, userId }, include: { attempts: true } }); }
  listAdmin() { return this.prisma.paymentTransaction.findMany({ include: { attempts: true, user: { include: { profile: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }); }
  async listReconciliationRequired(input: { limit?: number; cursor?: string } = {}) {
    const limit = Math.min(Math.max(1, input.limit ?? 50), 100);
    const rows = await this.prisma.paymentTransaction.findMany({
      where: { status: 'paid', metadataJson: { path: ['fulfillmentReconciliation', 'status'], equals: 'required' } },
      select: {
        id: true, userId: true, entityType: true, entityId: true, packageCode: true,
        provider: true, stripeCheckoutSessionId: true, stripePaymentIntentId: true,
        status: true, paidAt: true, amount: true, currency: true, metadataJson: true, updatedAt: true,
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const hasNextPage = rows.length > limit;
    const page = rows.slice(0, limit);
    const relatedPromotions = page.length
      ? await this.prisma.promotion.findMany({
          where: { paymentTransactionId: { in: page.map((row) => row.id) } },
          select: { id: true, paymentTransactionId: true },
        })
      : [];
    const promotionIdByPayment = new Map(relatedPromotions.map((promotion) => [promotion.paymentTransactionId, promotion.id]));
    const items = page.map((row) => {
      const metadata = this.jsonRecord(row.metadataJson);
      const reconciliation = this.jsonRecord(metadata.fulfillmentReconciliation);
      return {
        id: row.id,
        promotionId: promotionIdByPayment.get(row.id) ?? null,
        userId: row.userId,
        entityType: row.entityType,
        entityId: row.entityId,
        packageCode: row.packageCode,
        status: row.status,
        paidAt: row.paidAt,
        amount: row.amount,
        currency: row.currency,
        updatedAt: row.updatedAt,
        reconciliationStatus: reconciliation.status,
        reconciliationReasonCode: reconciliation.reasonCode,
        reconciliationRequiredAt: reconciliation.requiredAt,
        reconciliationLastAttemptAt: reconciliation.lastAttemptAt,
        stripePaymentVerified: row.provider === 'stripe' && Boolean(
          row.paidAt && (row.stripeCheckoutSessionId || row.stripePaymentIntentId),
        ),
      };
    });
    return {
      items,
      nextCursor: hasNextPage ? page[page.length - 1]?.id ?? null : null,
      hasNextPage,
      limit,
    };
  }

  async reconcile(id: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Payment transaction was not found');
    const isVerifiedStripePayment = transaction.provider === 'stripe' && transaction.status === 'paid' && Boolean(
      transaction.paidAt && (transaction.stripeCheckoutSessionId || transaction.stripePaymentIntentId),
    );
    if (!isVerifiedStripePayment) throw new ForbiddenException('Only verified paid Stripe transactions can be reconciled');
    const selected = transaction.packageCode ? findPackage(transaction.packageCode) : undefined;
    if (!selected || selected.type !== 'one_time') throw new BadRequestException('This transaction has no one-time promotion fulfillment to reconcile');

    const existing = await this.prisma.promotion.findUnique({ where: { paymentTransactionId: transaction.id } });
    if (existing) {
      await this.setFulfillmentReconciliation(transaction.id, 'resolved');
      return { ok: true, status: transaction.status, outcome: 'already_fulfilled', promotionId: existing.id };
    }

    await this.setFulfillmentReconciliation(transaction.id, 'required', 'admin_retry_started');
    try {
      await this.activateOneTime(transaction.id);
      const fulfilled = await this.prisma.promotion.findUnique({ where: { paymentTransactionId: transaction.id } });
      if (!fulfilled) throw new ConflictException('Verified payment did not produce a promotion');
      await this.setFulfillmentReconciliation(transaction.id, 'resolved');
      return { ok: true, status: transaction.status, outcome: 'fulfilled', promotionId: fulfilled.id };
    } catch (error) {
      await this.setFulfillmentReconciliation(transaction.id, 'required', 'admin_retry_failed');
      throw error;
    }
  }

  private async checkoutCompleted(session: Stripe.Checkout.Session) {
    const transaction = await this.findTransaction(session.id, session.metadata?.paymentTransactionId);
    if (!transaction) throw new NotFoundException('Payment transaction was not found');
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const paid = session.mode === 'subscription' || session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    await this.prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { stripePaymentIntentId: paymentIntentId, stripeSubscriptionId: subscriptionId, status: paid ? 'paid' : 'pending', paidAt: paid ? transaction.paidAt ?? new Date() : undefined, metadataJson: this.mergeJsonMetadata(transaction.metadataJson, session.metadata) } });
    if (paid && session.mode === 'payment') await this.fulfillVerifiedPromotion(transaction.id);
    if (subscriptionId) await this.retrieveAndSyncSubscription(subscriptionId);
    return { received: true };
  }

  private async updateCheckoutStatus(session: Stripe.Checkout.Session, status: string) {
    const transaction = await this.findTransaction(session.id, session.metadata?.paymentTransactionId);
    if (transaction?.status === 'pending') await this.prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { status } });
    this.logger.log({ action: 'stripe.checkout.expired', sessionId: session.id, transactionId: transaction?.id });
    return { received: true };
  }

  private async paymentIntentStatus(intent: Stripe.PaymentIntent, status: 'paid' | 'failed') {
    const transactionId = intent.metadata.paymentTransactionId;
    const transaction = transactionId ? await this.prisma.paymentTransaction.findUnique({ where: { id: transactionId } }) : await this.prisma.paymentTransaction.findFirst({ where: { stripePaymentIntentId: intent.id } });
    if (!transaction) return { received: true };
    if (status === 'failed' && transaction.status === 'paid') return { received: true };
    await this.prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { stripePaymentIntentId: intent.id, status, paidAt: status === 'paid' ? transaction.paidAt ?? new Date() : undefined } });
    if (status === 'paid' && transaction.packageCode && findPackage(transaction.packageCode)?.type === 'one_time') await this.fulfillVerifiedPromotion(transaction.id);
    this.logger[status === 'failed' ? 'warn' : 'log']({ action: `stripe.payment.${status}`, transactionId: transaction.id, paymentIntentId: intent.id, userId: transaction.userId });
    if (status === 'failed') void this.systemEvents.record({ severity: 'warn', source: 'stripe', message: 'Stripe payment failed', userId: transaction.userId, entityType: transaction.entityType, entityId: transaction.entityId ?? undefined, detailsJson: { transactionId: transaction.id, paymentIntentId: intent.id } });
    return { received: true };
  }

  private async activateOneTime(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    if (!transaction.packageCode || transaction.status !== 'paid') return;
    const selected = findPackage(transaction.packageCode);
    if (!selected || selected.type !== 'one_time') return;
    if (transaction.entityType !== selected.requiresEntityType) {
      throw new ForbiddenException('Payment package target does not match its entitlement');
    }
    const now = new Date(); const endsAt = new Date(now.getTime() + (selected.durationDays ?? 30) * 86400000);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.promotion.findUnique({ where: { paymentTransactionId: transaction.id } });
      if (existing) { this.logger.log({ action: 'stripe.webhook.duplicate_ignored', transactionId: transaction.id, promotionId: existing.id }); return; }
      if (transaction.entityType === 'listing' && transaction.entityId) {
        const eligible = await tx.listing.findFirst({ where: {
          id: transaction.entityId,
          status: 'active',
          publishedAt: { not: null },
          deletedAt: null,
          OR: [{ ownerUserId: transaction.userId }, { managedByUserId: transaction.userId }],
        }, select: { id: true } });
        if (!eligible) throw new ForbiddenException('Paid listing promotion target is no longer eligible');
      } else if (transaction.entityType === 'project' && transaction.entityId) {
        const eligible = await tx.project.findFirst({ where: {
          id: transaction.entityId,
          status: 'active',
          publishedAt: { not: null },
          deletedAt: null,
          developer: { ownerUserId: transaction.userId },
        }, select: { id: true } });
        if (!eligible) throw new ForbiddenException('Paid project promotion target is no longer eligible');
      }
      const targetId = transaction.entityId ?? transaction.id;
      await tx.promotion.create({ data: { entityType: transaction.entityType, entityId: targetId, promotionType: selected.code, packageCode: selected.code, placementCode: selected.requiresEntityType === 'banner' ? selected.code : null, startsAt: now, endsAt, status: 'active', purchasedByUserId: transaction.userId, paymentTransactionId: transaction.id, isHot: selected.entitlements.includes('listing_hot'), isFeatured: selected.entitlements.some((x) => x.includes('featured')) } });
      if (transaction.entityType === 'listing' && transaction.entityId) await tx.listing.update({ where: { id: transaction.entityId }, data: { isHot: selected.entitlements.includes('listing_hot') || undefined, isFeatured: selected.entitlements.includes('listing_featured') || undefined, lastRefreshedAt: selected.entitlements.includes('listing_refresh') ? now : undefined } });
      if (transaction.entityType === 'project' && transaction.entityId && selected.entitlements.includes('project_featured')) await tx.project.update({ where: { id: transaction.entityId }, data: { isFeatured: true } });
    });
    this.logger.log({ action: 'promotion.activated', transactionId: transaction.id, packageCode: selected.code, entityType: transaction.entityType, entityId: transaction.entityId, userId: transaction.userId });
  }

  private async fulfillVerifiedPromotion(transactionId: string) {
    try {
      await this.activateOneTime(transactionId);
    } catch (error) {
      const reasonCode = error instanceof ForbiddenException ? 'target_ineligible_or_mismatched' : 'promotion_fulfillment_failed';
      try {
        await this.setFulfillmentReconciliation(transactionId, 'required', reasonCode);
      } catch (markerError) {
        this.logger.error({ action: 'payment.reconciliation.marker_failed', transactionId, error: markerError instanceof Error ? markerError.name : 'unknown' });
      }
      try {
        await this.audit.record({
          action: 'payment.fulfillment.reconciliation_required',
          entityType: 'payment_transaction',
          entityId: transactionId,
          metadataJson: { outcome: 'reconciliation_required', reasonCode },
        });
      } catch (auditError) {
        this.logger.error({ action: 'payment.reconciliation.audit_failed', transactionId, error: auditError instanceof Error ? auditError.name : 'unknown' });
      }
      throw error;
    }
    await this.setFulfillmentReconciliation(transactionId, 'resolved');
  }

  private async setFulfillmentReconciliation(transactionId: string, status: 'required' | 'resolved', reasonCode?: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({ where: { id: transactionId }, select: { metadataJson: true } });
    if (!transaction) return;
    const metadata = this.jsonRecord(transaction.metadataJson);
    const previous = this.jsonRecord(metadata.fulfillmentReconciliation);
    if (status === 'resolved' && previous.status !== 'required') return;
    const now = new Date().toISOString();
    const reconciliation = status === 'required'
      ? { ...previous, status, reasonCode, requiredAt: previous.requiredAt ?? now, lastAttemptAt: now }
      : { ...previous, status, resolvedAt: now };
    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: { metadataJson: { ...metadata, fulfillmentReconciliation: reconciliation } as Prisma.InputJsonValue },
    });
  }

  private mergeJsonMetadata(existing: unknown, stripeMetadata?: Stripe.Metadata | null) {
    const metadata = this.jsonRecord(existing);
    return stripeMetadata ? { ...metadata, ...stripeMetadata } as Prisma.InputJsonValue : (Object.keys(metadata).length ? metadata as Prisma.InputJsonValue : undefined);
  }

  private jsonRecord(value: unknown): Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, any>
      : {};
  }

  private async retrieveAndSyncSubscription(id: string) { return this.syncSubscription(await this.requireStripe().subscriptions.retrieve(id)); }

  private async syncSubscription(subscription: Stripe.Subscription) {
    const transactionId = subscription.metadata.paymentTransactionId;
    const transaction = transactionId ? await this.prisma.paymentTransaction.findUnique({ where: { id: transactionId } }) : await this.prisma.paymentTransaction.findFirst({ where: { stripeSubscriptionId: subscription.id } });
    if (!transaction?.packageCode) return { received: true };
    const selected = findPackage(transaction.packageCode);
    if (!selected) return { received: true };
    const item = subscription.items.data[0];
    const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000) : new Date(subscription.created * 1000);
    const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : undefined;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const plan = await this.prisma.subscriptionPlan.upsert({ where: { code: selected.code }, update: { name: selected.name, priceAmount: selected.amount, currency: (process.env.STRIPE_CURRENCY ?? 'pkr').toUpperCase(), featuresJson: selected.entitlements }, create: { code: selected.code, name: selected.name, billingInterval: 'monthly', priceAmount: selected.amount, currency: (process.env.STRIPE_CURRENCY ?? 'pkr').toUpperCase(), featuresJson: selected.entitlements } });
    await this.prisma.userSubscription.upsert({ where: { stripeSubscriptionId: subscription.id }, update: { status: subscription.status, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, endAt: periodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end, metadataJson: subscription.metadata }, create: { userId: transaction.userId, planId: plan.id, packageCode: selected.code, status: subscription.status, startAt: periodStart, endAt: periodEnd, autoRenew: !subscription.cancel_at_period_end, paymentProvider: 'stripe', externalReference: subscription.id, stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end, metadataJson: subscription.metadata } });
    await this.prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { stripeSubscriptionId: subscription.id, status: subscription.status === 'active' || subscription.status === 'trialing' ? 'paid' : transaction.status, paidAt: subscription.status === 'active' ? transaction.paidAt ?? new Date() : undefined } });
    this.logger[subscription.status === 'past_due' || subscription.status === 'unpaid' ? 'warn' : 'log']({ action: 'stripe.subscription.updated', subscriptionId: subscription.id, status: subscription.status, userId: transaction.userId, packageCode: selected.code });
    return { received: true };
  }

  private async invoiceStatus(invoice: Stripe.Invoice, paid: boolean) {
    const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string' ? invoice.parent.subscription_details.subscription : invoice.parent?.subscription_details?.subscription?.id;
    if (!subscriptionId) return { received: true };
    const subscription = await this.prisma.userSubscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
    if (subscription) await this.prisma.userSubscription.update({ where: { id: subscription.id }, data: { status: paid ? 'active' : 'past_due' } });
    return { received: true };
  }

  private async findTransaction(sessionId: string, transactionId?: string) { return transactionId ? this.prisma.paymentTransaction.findUnique({ where: { id: transactionId } }) : this.prisma.paymentTransaction.findUnique({ where: { stripeCheckoutSessionId: sessionId } }); }

  private async validateTarget(userId: string, selected: MonetizationPackage, entityType?: string, entityId?: string) {
    if (entityType && entityType !== selected.requiresEntityType) throw new BadRequestException(`Package requires entityType=${selected.requiresEntityType}`);
    if (selected.requiresEntityType === 'listing') {
      if (!entityId) throw new BadRequestException('entityId is required');
      const eligible = await this.prisma.listing.findFirst({ where: {
        id: entityId,
        status: 'active',
        publishedAt: { not: null },
        deletedAt: null,
        OR: [{ ownerUserId: userId }, { managedByUserId: userId }],
      } });
      if (!eligible) throw new ForbiddenException('You do not manage an eligible published listing');
      return entityId;
    }
    if (selected.requiresEntityType === 'project' || selected.requiresEntityType === 'developer') {
      const developer = await this.prisma.developer.findFirst({ where: { ownerUserId: userId } });
      if (!developer) throw new ForbiddenException('A developer profile is required');
      if (selected.requiresEntityType === 'project') {
        if (!entityId) throw new BadRequestException('entityId is required');
        const project = await this.prisma.project.findFirst({ where: { id: entityId, developerId: developer.id, status: 'active', publishedAt: { not: null }, deletedAt: null } });
        if (!project) throw new ForbiddenException('You do not manage an eligible published project');
        return entityId;
      }
      return developer.id;
    }
    if (selected.requiresEntityType === 'agency') return userId;
    return entityId;
  }

  private requireStripe() { if (!this.stripe) throw new ServiceUnavailableException('Stripe is not configured'); return this.stripe; }
}
