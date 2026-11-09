import { PromotionActivationDeliveryService } from './promotion-activation-delivery.service';

const eventId = 'outbox-event-1';
const promotionId = 'promotion-1';
const now = new Date('2026-11-09T12:00:00.000Z');

function setup(options: { enabled?: boolean; claimCount?: number; attempts?: number; notificationStatus?: string; searchIndexStatus?: string } = {}) {
  const event = {
    id: eventId,
    promotionId,
    notificationId: null,
    notificationStatus: options.notificationStatus ?? 'pending',
    notificationAttemptCount: options.attempts ?? 0,
    notificationGeneration: 0,
    notificationClaimToken: null,
    notificationClaimedAt: null,
    notificationEnqueuedAt: null,
    notificationNextAttemptAt: null,
    notificationCompletedAt: null,
    notificationLastError: null,
    searchIndexStatus: options.searchIndexStatus ?? 'succeeded',
    searchIndexAttemptCount: 0,
    searchIndexGeneration: 0,
    searchIndexClaimToken: null,
    searchIndexClaimedAt: null,
    searchIndexEnqueuedAt: null,
    searchIndexNextAttemptAt: null,
    searchIndexCompletedAt: now,
    searchIndexLastError: null,
    completedAt: null,
    promotion: { id: promotionId, entityType: 'listing', entityId: 'listing-1', purchasedByUserId: 'seller-1' },
  };
  const tx = {
    promotionActivationOutbox: {
      findFirst: jest.fn().mockResolvedValue(event),
      findUnique: jest.fn().mockResolvedValue(event),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notification: {
      upsert: jest.fn().mockResolvedValue({
        id: eventId, userId: 'seller-1', notificationType: 'promotion_activated',
        payloadJson: { promotionId, eventId },
      }),
    },
    systemEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    promotionActivationOutbox: {
      findMany: jest.fn().mockResolvedValue([{ id: eventId }]),
      findUnique: jest.fn().mockResolvedValue(event),
      updateMany: jest.fn().mockResolvedValue({ count: options.claimCount ?? 1 }),
    },
    listing: { findFirst: jest.fn().mockResolvedValue({ publicId: 'PUB-1' }) },
    project: { findFirst: jest.fn().mockResolvedValue({ publicId: 'PROJ-1' }) },
  };
  const notifications = { add: jest.fn().mockResolvedValue({}) };
  const indexing = { add: jest.fn().mockResolvedValue({}) };
  const config = { get: jest.fn(() => options.enabled === true) };
  return {
    service: new PromotionActivationDeliveryService(prisma as never, config as never, notifications as never, indexing as never),
    prisma, tx, notifications, indexing, event,
  };
}

describe('PromotionActivationDeliveryService', () => {
  it('does no dispatch or consumer processing when the feature gate is disabled', async () => {
    const { service, prisma } = setup();
    await expect(service.dispatchPending(now)).resolves.toEqual({ disabled: true, dispatched: 0 });
    await expect(service.processNotification(eventId, 0, now)).resolves.toBe(false);
    expect(prisma.promotionActivationOutbox.findMany).not.toHaveBeenCalled();
    expect(prisma.promotionActivationOutbox.updateMany).not.toHaveBeenCalled();
  });

  it('enqueues a pending effect without treating enqueue as consumer acknowledgment', async () => {
    const { service, prisma, notifications, event } = setup({ enabled: true });
    event.notificationStatus = 'pending';
    event.notificationGeneration = 0;
    prisma.promotionActivationOutbox.findUnique
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce({ ...event, notificationStatus: 'enqueued', notificationGeneration: 1 });
    await expect(service.dispatchPending(now)).resolves.toEqual({ disabled: false, dispatched: 1 });
    expect(notifications.add).toHaveBeenCalledWith('deliver-notification', expect.objectContaining({
      eventId, effectGeneration: 1, notificationId: eventId, userId: 'seller-1',
    }), { jobId: `promotion-activation-notification-${eventId}-1` });
    expect(prisma.promotionActivationOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ notificationStatus: 'enqueued', notificationGeneration: { increment: 1 } }),
    }));
    expect(event.completedAt).toBeNull();
  });

  it('creates the in-app record and acknowledges the exact notification effect transactionally', async () => {
    const { service, tx, prisma } = setup({ enabled: true });
    await expect(service.processNotification(eventId, 0, now)).resolves.toBe(true);
    expect(prisma.promotionActivationOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: eventId, notificationStatus: 'enqueued', notificationGeneration: 0 },
    }));
    expect(tx.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: eventId },
      create: expect.objectContaining({ id: eventId, userId: 'seller-1', notificationType: 'promotion_activated' }),
    }));
    expect(tx.promotionActivationOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: eventId, notificationStatus: 'processing', notificationGeneration: 0, notificationClaimToken: expect.any(String) }),
      data: expect.objectContaining({ notificationStatus: 'succeeded', notificationCompletedAt: now }),
    }));
  });

  it('makes duplicate acknowledgments and concurrent claims safe no-ops', async () => {
    const duplicate = setup({ enabled: true, claimCount: 0 });
    await expect(duplicate.service.processNotification(eventId, 0, now)).resolves.toBe(false);
    expect(duplicate.prisma.$transaction).not.toHaveBeenCalled();

    const concurrent = setup({ enabled: true });
    concurrent.prisma.promotionActivationOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const results = await Promise.all([
      concurrent.service.processNotification(eventId, 0, now),
      concurrent.service.processNotification(eventId, 0, now),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(concurrent.tx.notification.upsert).toHaveBeenCalledTimes(1);
  });

  it('stores a retryable failure with bounded backoff when notification persistence fails', async () => {
    const context = setup({ enabled: true, attempts: 1 });
    context.tx.notification.upsert.mockRejectedValue(new Error('provider detail must not persist'));
    await expect(context.service.processNotification(eventId, 0, now)).rejects.toThrow('provider detail must not persist');
    const failureUpdate = context.tx.promotionActivationOutbox.updateMany.mock.calls.at(-1)?.[0];
    expect(failureUpdate.data.notificationStatus).toBe('retryable');
    expect(failureUpdate.data.notificationAttemptCount).toBeUndefined();
    expect(failureUpdate.data.notificationNextAttemptAt.getTime()).toBe(now.getTime() + 60_000);
    expect(failureUpdate.data.notificationLastError).toBe('Error');
  });

  it('marks exhausted delivery terminal and publishes one existing System Event', async () => {
    const context = setup({ enabled: true, attempts: 5 });
    context.tx.notification.upsert.mockRejectedValue(new Error('sensitive error details'));
    await expect(context.service.processNotification(eventId, 0, now)).rejects.toThrow('sensitive error details');
    expect(context.tx.promotionActivationOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ notificationStatus: 'terminal', notificationLastError: 'Error' }),
    }));
    expect(context.tx.systemEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        source: 'promotion', severity: 'error', entityId: promotionId,
        detailsJson: expect.objectContaining({ outboxEventId: eventId, effect: 'notification', attempts: 5, errorType: 'Error' }),
      }),
    }));
  });

  it('claims search effects only for the matching promotion target', async () => {
    const context = setup({ enabled: true });
    await expect(context.service.claimSearchIndex(eventId, 0, 'listing', 'listing-1', now)).resolves.toEqual(expect.any(String));
    context.prisma.promotionActivationOutbox.findUnique.mockResolvedValueOnce({
      ...context.event,
      promotion: { ...context.event.promotion, entityId: 'other-listing' },
    });
    await expect(context.service.claimSearchIndex(eventId, 0, 'listing', 'listing-1', now)).resolves.toBeNull();
  });

  it('re-enqueues a due retry with a new generation so stale jobs cannot claim it', async () => {
    const context = setup({ enabled: true });
    const retryable = {
      ...context.event,
      notificationStatus: 'retryable',
      notificationGeneration: 1,
      notificationNextAttemptAt: new Date(now.getTime() - 1),
    };
    const enqueued = { ...retryable, notificationStatus: 'enqueued', notificationGeneration: 2 };
    context.prisma.promotionActivationOutbox.findUnique
      .mockResolvedValueOnce(retryable)
      .mockResolvedValueOnce(enqueued);
    await context.service.dispatchPending(now);
    expect(context.notifications.add).toHaveBeenCalledWith('deliver-notification', expect.objectContaining({ effectGeneration: 2 }), {
      jobId: `promotion-activation-notification-${eventId}-2`,
    });
  });

  it('bounds events that remain enqueued without a consumer and exposes terminal state', async () => {
    const context = setup({ enabled: true, attempts: 4, notificationStatus: 'enqueued' });
    Object.assign(context.event, { notificationEnqueuedAt: new Date(now.getTime() - 10 * 60_000) });
    await context.service.dispatchPending(now);
    expect(context.notifications.add).not.toHaveBeenCalled();
    expect(context.tx.promotionActivationOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ notificationStatus: 'terminal', notificationAttemptCount: { increment: 1 } }),
    }));
    expect(context.tx.systemEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source: 'promotion', entityId: promotionId }),
    }));
  });
});
