import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { NotificationJobPayload, QUEUES, SearchIndexingJobPayload } from '@Gharazi/shared-events';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PROMOTION_LIFECYCLE_PRISMA } from './promotion-lifecycle.constants';

type Effect = 'notification' | 'searchIndex';
type EffectFields = {
  status: string;
  attempts: string;
  generation: string;
  claimToken: string;
  claimedAt: string;
  nextAttemptAt: string;
  completedAt: string;
  lastError: string;
  enqueuedAt: string;
};

const EFFECT_FIELDS: Record<Effect, EffectFields> = {
  notification: {
    status: 'notificationStatus', attempts: 'notificationAttemptCount', generation: 'notificationGeneration',
    claimToken: 'notificationClaimToken', claimedAt: 'notificationClaimedAt', nextAttemptAt: 'notificationNextAttemptAt',
    completedAt: 'notificationCompletedAt', lastError: 'notificationLastError', enqueuedAt: 'notificationEnqueuedAt',
  },
  searchIndex: {
    status: 'searchIndexStatus', attempts: 'searchIndexAttemptCount', generation: 'searchIndexGeneration',
    claimToken: 'searchIndexClaimToken', claimedAt: 'searchIndexClaimedAt', nextAttemptAt: 'searchIndexNextAttemptAt',
    completedAt: 'searchIndexCompletedAt', lastError: 'searchIndexLastError', enqueuedAt: 'searchIndexEnqueuedAt',
  },
};

const BATCH_SIZE = 100;
const MAX_EFFECT_ATTEMPTS = 5;
const CLAIM_LEASE_MS = 5 * 60 * 1000;
const BASE_BACKOFF_MS = 60 * 1000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

@Injectable()
export class PromotionActivationDeliveryService {
  private readonly logger = new Logger(PromotionActivationDeliveryService.name);

  constructor(
    @Inject(PROMOTION_LIFECYCLE_PRISMA) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.notifications) private readonly notifications: Queue<NotificationJobPayload>,
    @InjectQueue(QUEUES.searchIndexing) private readonly indexing: Queue<SearchIndexingJobPayload>,
  ) {}

  async dispatchPending(now = new Date()) {
    if (!this.enabled()) return { disabled: true, dispatched: 0 };
    const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS);
    const events = await this.prisma.promotionActivationOutbox.findMany({
      where: {
        OR: [
          { notificationStatus: 'pending' },
          { notificationStatus: 'retryable', notificationNextAttemptAt: { lte: now } },
          { notificationStatus: 'enqueued', notificationEnqueuedAt: { lt: staleBefore } },
          { notificationStatus: 'processing', notificationClaimedAt: { lt: staleBefore } },
          { searchIndexStatus: 'pending' },
          { searchIndexStatus: 'retryable', searchIndexNextAttemptAt: { lte: now } },
          { searchIndexStatus: 'enqueued', searchIndexEnqueuedAt: { lt: staleBefore } },
          { searchIndexStatus: 'processing', searchIndexClaimedAt: { lt: staleBefore } },
        ],
      },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: BATCH_SIZE,
    });

    let dispatched = 0;
    for (const event of events) {
      dispatched += Number(await this.dispatchEffect(event.id, 'notification', now));
      dispatched += Number(await this.dispatchEffect(event.id, 'searchIndex', now));
    }
    return { disabled: false, dispatched };
  }

  async processNotification(eventId: string, generation: number, now = new Date()) {
    if (!this.enabled()) return false;
    const claimToken = randomUUID();
    const claimed = await this.claim(eventId, 'notification', generation, claimToken, now);
    if (!claimed) return false;

    try {
      await this.prisma.$transaction(async (tx) => {
        const event = await tx.promotionActivationOutbox.findFirst({
          where: { id: eventId, notificationStatus: 'processing', notificationGeneration: generation, notificationClaimToken: claimToken },
          include: { promotion: true },
        });
        if (!event) throw new Error('Promotion notification claim is no longer current');

        const notification = await tx.notification.upsert({
          where: { id: event.id },
          create: {
            id: event.id,
            userId: event.promotion.purchasedByUserId,
            notificationType: 'promotion_activated',
            title: 'Promotion activated',
            payloadJson: { promotionId: event.promotionId, eventId } as Prisma.InputJsonValue,
            deliveries: { create: { channel: 'in_app', deliveryStatus: 'sent', sentAt: now } },
          },
          update: {},
        });
        const payload = notification.payloadJson as Record<string, unknown> | null;
        if (
          notification.userId !== event.promotion.purchasedByUserId ||
          notification.notificationType !== 'promotion_activated' ||
          payload?.promotionId !== event.promotionId
        ) throw new Error('Stable promotion notification ID conflicts with another notification');

        const ack = await tx.promotionActivationOutbox.updateMany({
          where: { id: eventId, notificationStatus: 'processing', notificationGeneration: generation, notificationClaimToken: claimToken },
          data: {
            notificationStatus: 'succeeded',
            notificationId: notification.id,
            notificationCreatedAt: now,
            notificationCompletedAt: now,
            notificationClaimToken: null,
            notificationClaimedAt: null,
            notificationNextAttemptAt: null,
            notificationLastError: null,
          },
        });
        if (ack.count !== 1) throw new Error('Promotion notification acknowledgment lost its claim');
        await this.completeOutboxIfReady(tx, eventId, now);
      });
      return true;
    } catch (error) {
      await this.failEffect(eventId, 'notification', generation, claimToken, error, now);
      throw error;
    }
  }

  async claimSearchIndex(eventId: string, generation: number, entityType: string, entityId: string, now = new Date()) {
    if (!this.enabled()) return null;
    const event = await this.prisma.promotionActivationOutbox.findUnique({ where: { id: eventId }, include: { promotion: true } });
    if (!event || event.promotion.entityType !== entityType || event.promotion.entityId !== entityId) return null;
    const claimToken = randomUUID();
    return await this.claim(eventId, 'searchIndex', generation, claimToken, now) ? claimToken : null;
  }

  async acknowledgeSearchIndex(eventId: string, generation: number, claimToken: string, now = new Date()) {
    if (!this.enabled()) return false;
    return this.prisma.$transaction(async (tx) => {
      const ack = await tx.promotionActivationOutbox.updateMany({
        where: { id: eventId, searchIndexStatus: 'processing', searchIndexGeneration: generation, searchIndexClaimToken: claimToken },
        data: {
          searchIndexStatus: 'succeeded',
          searchIndexCompletedAt: now,
          searchIndexClaimToken: null,
          searchIndexClaimedAt: null,
          searchIndexNextAttemptAt: null,
          searchIndexLastError: null,
        },
      });
      if (ack.count !== 1) return false;
      await this.completeOutboxIfReady(tx, eventId, now);
      return true;
    });
  }

  async failSearchIndex(eventId: string, generation: number, claimToken: string, error: unknown, now = new Date()) {
    await this.failEffect(eventId, 'searchIndex', generation, claimToken, error, now);
  }

  private enabled() {
    return this.config.get<boolean>('PROMOTION_ACTIVATION_ENABLED') === true;
  }

  private async claim(eventId: string, effect: Effect, generation: number, claimToken: string, now: Date) {
    const fields = EFFECT_FIELDS[effect];
    const where = {
      id: eventId,
      [fields.status]: 'enqueued',
      [fields.generation]: generation,
    } as Prisma.PromotionActivationOutboxWhereInput;
    const data = {
      [fields.status]: 'processing',
      [fields.claimToken]: claimToken,
      [fields.claimedAt]: now,
      [fields.attempts]: { increment: 1 },
      completedAt: null,
    } as Prisma.PromotionActivationOutboxUpdateManyMutationInput;
    const result = await this.prisma.promotionActivationOutbox.updateMany({ where, data });
    return result.count === 1;
  }

  private async dispatchEffect(eventId: string, effect: Effect, now: Date) {
    if (!this.enabled()) return false;
    const fields = EFFECT_FIELDS[effect];
    const event = await this.prisma.promotionActivationOutbox.findUnique({ where: { id: eventId }, include: { promotion: true } });
    if (!event) return false;
    let status = (event as unknown as Record<string, unknown>)[fields.status];
    if (status === 'succeeded' || status === 'terminal' || status == null) return false;

    if (status === 'processing') {
      const claimedAt = (event as unknown as Record<string, unknown>)[fields.claimedAt] as Date | null;
      if (!claimedAt || claimedAt.getTime() >= now.getTime() - CLAIM_LEASE_MS) return false;
      const token = (event as unknown as Record<string, unknown>)[fields.claimToken] as string | null;
      if (token) await this.failEffect(eventId, effect, (event as unknown as Record<string, unknown>)[fields.generation] as number, token, new Error('StaleConsumerClaim'), now, true);
      return false;
    }

    if (status === 'retryable') {
      const next = (event as unknown as Record<string, unknown>)[fields.nextAttemptAt] as Date | null;
      if (next && next > now) return false;
      if ((event as unknown as Record<string, unknown>)[fields.attempts] as number >= MAX_EFFECT_ATTEMPTS) {
        await this.markTerminal(eventId, effect, now);
        return false;
      }
    } else if (status === 'enqueued') {
      const enqueuedAt = (event as unknown as Record<string, unknown>)[fields.enqueuedAt] as Date | null;
      if (!enqueuedAt || enqueuedAt.getTime() >= now.getTime() - CLAIM_LEASE_MS) return false;
      const generation = (event as unknown as Record<string, unknown>)[fields.generation] as number;
      await this.failEnqueue(eventId, effect, generation, new Error('StaleQueueDelivery'), now);
      return false;
    } else if (status !== 'pending') {
      return false;
    }

    const generation = (event as unknown as Record<string, unknown>)[fields.generation] as number;
    const where: Record<string, unknown> = {
      id: eventId,
      [fields.status]: status,
      [fields.generation]: generation,
    };
    if (status === 'retryable') where[fields.nextAttemptAt] = { lte: now };

    const prepared = await this.prisma.promotionActivationOutbox.updateMany({
      where: where as Prisma.PromotionActivationOutboxWhereInput,
      data: {
        [fields.status]: 'enqueued',
        [fields.generation]: { increment: 1 },
        [fields.enqueuedAt]: now,
        [fields.claimToken]: null,
        [fields.claimedAt]: null,
        [fields.nextAttemptAt]: null,
        [fields.lastError]: null,
        completedAt: null,
      } as Prisma.PromotionActivationOutboxUpdateManyMutationInput,
    });
    if (prepared.count !== 1) return false;

    const current = await this.prisma.promotionActivationOutbox.findUnique({ where: { id: eventId } });
    if (!current) return false;
    const currentValues = current as unknown as Record<string, unknown>;
    const nextGeneration = currentValues[fields.generation] as number;
    const jobId = `promotion-activation-${effect}-${eventId}-${nextGeneration}`;
    try {
      if (effect === 'notification') {
        await this.notifications.add('deliver-notification', {
          userId: event.promotion?.purchasedByUserId ?? '',
          notificationId: event.id,
          eventId,
          effectGeneration: nextGeneration,
          channel: 'in_app',
          template: 'promotion_activated',
          data: { promotionId: event.promotionId, eventId },
        }, { jobId });
      } else {
        const target = await this.searchTarget(event);
        if (!target) throw new Error('Promotion target is no longer indexable');
        await this.indexing.add('index-' + (event.promotion.entityType === 'listing' ? 'listing' : 'project'), {
          type: event.promotion.entityType === 'listing' ? 'index-listing' : 'index-project',
          entityId: event.promotion.entityId,
          publicId: target.publicId,
          eventId,
          effectGeneration: nextGeneration,
        }, { jobId });
      }
      return true;
    } catch (error) {
      await this.failEnqueue(eventId, effect, nextGeneration, error, now);
      return false;
    }
  }

  private async searchTarget(event: { promotion: { entityType: string; entityId: string } }) {
    if (event.promotion.entityType === 'listing') {
      const listing = await this.prisma.listing.findFirst({
        where: { id: event.promotion.entityId, status: 'active', deletedAt: null },
        select: { publicId: true },
      });
      return listing;
    }
    if (event.promotion.entityType === 'project') {
      const project = await this.prisma.project.findFirst({
        where: { id: event.promotion.entityId, status: 'active', deletedAt: null },
        select: { publicId: true },
      });
      return project;
    }
    return null;
  }

  private async failEnqueue(eventId: string, effect: Effect, generation: number, error: unknown, now: Date) {
    const fields = EFFECT_FIELDS[effect];
    await this.prisma.$transaction(async (tx) => {
      const event = await tx.promotionActivationOutbox.findUnique({ where: { id: eventId } });
      if (!event) return;
      const attempts = (event as unknown as Record<string, unknown>)[fields.attempts] as number;
      const terminal = attempts + 1 >= MAX_EFFECT_ATTEMPTS;
      const updated = await tx.promotionActivationOutbox.updateMany({
        where: { id: eventId, [fields.status]: 'enqueued', [fields.generation]: generation } as Prisma.PromotionActivationOutboxWhereInput,
        data: {
          [fields.status]: terminal ? 'terminal' : 'retryable',
          [fields.attempts]: { increment: 1 },
          [fields.nextAttemptAt]: terminal ? null : this.nextAttempt(attempts + 1, now),
          [fields.lastError]: this.safeError(error),
          [fields.claimToken]: null,
          [fields.claimedAt]: null,
        } as Prisma.PromotionActivationOutboxUpdateManyMutationInput,
      });
      if (updated.count === 1 && terminal) await this.recordTerminalEvent(tx, event, effect, attempts + 1, error);
    });
    this.logger.error({ action: 'promotion.activation.enqueue_failed', eventId, effect, errorType: this.safeError(error) });
  }

  private async failEffect(eventId: string, effect: Effect, generation: number, claimToken: string, error: unknown, now: Date, stale = false) {
    const fields = EFFECT_FIELDS[effect];
    await this.prisma.$transaction(async (tx) => {
      const event = await tx.promotionActivationOutbox.findUnique({ where: { id: eventId } });
      if (!event) return;
      const values = event as unknown as Record<string, unknown>;
      const attempts = values[fields.attempts] as number;
      const terminal = attempts >= MAX_EFFECT_ATTEMPTS;
      const where: Record<string, unknown> = {
        id: eventId,
        [fields.status]: 'processing',
        [fields.generation]: generation,
        [fields.claimToken]: claimToken,
      };
      if (stale) where[fields.claimedAt] = { lt: new Date(now.getTime() - CLAIM_LEASE_MS) };
      const updated = await tx.promotionActivationOutbox.updateMany({
        where: where as Prisma.PromotionActivationOutboxWhereInput,
        data: {
          [fields.status]: terminal ? 'terminal' : 'retryable',
          [fields.nextAttemptAt]: terminal ? null : this.nextAttempt(attempts, now),
          [fields.lastError]: this.safeError(error),
          [fields.claimToken]: null,
          [fields.claimedAt]: null,
        } as Prisma.PromotionActivationOutboxUpdateManyMutationInput,
      });
      if (updated.count === 1 && terminal) await this.recordTerminalEvent(tx, event, effect, attempts, error);
    });
    this.logger.error({ action: 'promotion.activation.effect_failed', eventId, effect, errorType: this.safeError(error) });
  }

  private async markTerminal(eventId: string, effect: Effect, now: Date) {
    const fields = EFFECT_FIELDS[effect];
    await this.prisma.$transaction(async (tx) => {
      const event = await tx.promotionActivationOutbox.findUnique({ where: { id: eventId } });
      if (!event) return;
      const updated = await tx.promotionActivationOutbox.updateMany({
        where: { id: eventId, [fields.status]: 'retryable', [fields.attempts]: { gte: MAX_EFFECT_ATTEMPTS } } as Prisma.PromotionActivationOutboxWhereInput,
        data: { [fields.status]: 'terminal', [fields.nextAttemptAt]: null, [fields.lastError]: 'MaximumAttemptsReached' } as Prisma.PromotionActivationOutboxUpdateManyMutationInput,
      });
      if (updated.count === 1) await this.recordTerminalEvent(tx, event, effect, MAX_EFFECT_ATTEMPTS, new Error('MaximumAttemptsReached'));
    });
    void now;
  }

  private async recordTerminalEvent(tx: Prisma.TransactionClient, event: { id: string; promotionId: string }, effect: Effect, attempts: number, error: unknown) {
    await tx.systemEvent.create({
      data: {
        severity: 'error',
        source: 'promotion',
        message: `Promotion activation ${effect} delivery exhausted retries`,
        entityType: 'promotion',
        entityId: event.promotionId,
        detailsJson: {
          outboxEventId: event.id,
          effect,
          attempts,
          errorType: this.safeError(error),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private async completeOutboxIfReady(tx: Prisma.TransactionClient, eventId: string, now: Date) {
    await tx.promotionActivationOutbox.updateMany({
      where: { id: eventId, notificationStatus: 'succeeded', searchIndexStatus: 'succeeded' },
      data: { completedAt: now, claimedAt: null },
    });
  }

  private nextAttempt(attempt: number, now: Date) {
    const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1));
    return new Date(now.getTime() + delay);
  }

  private safeError(error: unknown) {
    return (error instanceof Error ? error.name : 'UnknownError').slice(0, 1000);
  }
}
