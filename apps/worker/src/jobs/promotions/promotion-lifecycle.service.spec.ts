import { PromotionLifecycleService } from './promotion-lifecycle.service';

const NOW = new Date('2026-11-09T12:00:00.000Z');
const promotionId = 'promotion-1';
const eventId = 'event-1';

function setup(options: { enabled?: boolean; payment?: Record<string, unknown>; promotion?: Record<string, unknown>; claimCount?: number; dispatch?: boolean } = {}) {
  const promotion = {
    id: promotionId,
    entityType: 'listing',
    entityId: 'listing-1',
    promotionType: 'listing_hot',
    startsAt: new Date(NOW.getTime() - 1000),
    endsAt: new Date(NOW.getTime() + 14 * 86_400_000 - 1000),
    status: 'scheduled',
    purchasedByUserId: 'seller-1',
    packageCode: 'listing_hot',
    paymentTransactionId: 'payment-1',
    isHot: true,
    isFeatured: false,
    ...options.promotion,
  };
  const payment = {
    id: 'payment-1', provider: 'stripe', status: 'paid', paidAt: NOW,
    stripeCheckoutSessionId: 'cs_verified', stripePaymentIntentId: null,
    userId: 'seller-1', packageCode: 'listing_hot', entityType: 'listing', entityId: 'listing-1',
    amount: { toString: () => '5000' }, currency: 'PKR',
    ...options.payment,
  };
  const event = {
    id: eventId, promotionId, eventKey: `promotion-activation:${promotionId}`,
    completedAt: null, notificationCreatedAt: null, notificationId: null,
    notificationEnqueuedAt: null, searchIndexHandledAt: null,
    promotion: { ...promotion, status: 'active' },
  };
  const tx = {
    promotion: {
      findUnique: jest.fn().mockResolvedValue(promotion),
      updateMany: jest.fn().mockResolvedValue({ count: options.claimCount ?? 1 }),
      findMany: jest.fn().mockResolvedValue([{ promotionType: 'listing_hot', isHot: true, isFeatured: false }]),
    },
    paymentTransaction: { findUnique: jest.fn().mockResolvedValue(payment) },
    listing: {
      findFirst: jest.fn().mockResolvedValue({ id: 'listing-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    project: { findFirst: jest.fn() },
    notification: {
      upsert: jest.fn().mockResolvedValue({
        id: eventId, userId: 'seller-1', notificationType: 'promotion_activated',
        payloadJson: { promotionId, eventId },
      }),
    },
    promotionActivationOutbox: {
      create: jest.fn().mockResolvedValue(event),
      update: jest.fn().mockResolvedValue(event),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    promotionActivationOutbox: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue(options.dispatch === false ? [] : [{ id: eventId }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(event),
      update: jest.fn().mockResolvedValue(event),
    },
    promotion: { findMany: jest.fn().mockResolvedValue([{ id: promotionId }]) },
    listing: { findUnique: jest.fn().mockResolvedValue({ id: 'listing-1', publicId: 'PUB-1', status: 'active', deletedAt: null }) },
    project: { findUnique: jest.fn() },
  };
  const notificationQueue = { add: jest.fn().mockResolvedValue({}) };
  const indexingQueue = { add: jest.fn().mockResolvedValue({}) };
  const delivery = { dispatchPending: jest.fn().mockResolvedValue({ disabled: false, dispatched: 0 }) };
  const config = { get: jest.fn((key: string) => key === 'PROMOTION_ACTIVATION_ENABLED' ? options.enabled === true : key === 'STRIPE_CURRENCY' ? 'pkr' : undefined) };
  return {
    service: new PromotionLifecycleService(prisma as never, config as never, delivery as never),
    prisma, tx, notificationQueue, indexingQueue, delivery, promotion, payment,
  };
}

describe('PromotionLifecycleService', () => {
  it('defaults to a fail-closed no-op before database reads or writes', async () => {
    const { service, prisma, tx } = setup();
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ disabled: true, activated: 0 });
    expect(prisma.promotion.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.promotion.updateMany).not.toHaveBeenCalled();
  });

  it('atomically activates a valid paid promotion and records durable audit/outbox intent', async () => {
    const { service, tx, prisma } = setup({ enabled: true });
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ disabled: false, activated: 1, dispatched: 0 });
    expect(tx.promotion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: promotionId, status: 'scheduled' }), data: { status: 'active' },
    }));
    expect(tx.promotionActivationOutbox.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      promotionId, eventKey: `promotion-activation:${promotionId}`,
      notificationStatus: 'pending', searchIndexStatus: 'pending',
    }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'promotion.activated', entityId: promotionId }) });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('does not claim a promotion without verified Stripe payment evidence', async () => {
    const { service, tx, notificationQueue, indexingQueue } = setup({ enabled: true, payment: { provider: 'manual' }, dispatch: false });
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ activated: 0 });
    expect(tx.promotion.updateMany).not.toHaveBeenCalled();
    expect(tx.promotionActivationOutbox.create).not.toHaveBeenCalled();
    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(indexingQueue.add).not.toHaveBeenCalled();
  });

  it.each([
    ['unpaid', { status: 'pending' }],
    ['missing payment time', { paidAt: null }],
    ['future payment time', { paidAt: new Date(NOW.getTime() + 1000) }],
    ['wrong purchaser', { userId: 'someone-else' }],
    ['wrong target', { entityId: 'other-listing' }],
    ['wrong package', { packageCode: 'listing_super_hot' }],
    ['wrong amount', { amount: { toString: () => '1' } }],
    ['missing Stripe reference', { stripeCheckoutSessionId: null, stripePaymentIntentId: null }],
  ])('rejects verified-payment mismatch: %s', async (_label, payment) => {
    const { service, tx } = setup({ enabled: true, payment, dispatch: false });
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ activated: 0 });
    expect(tx.promotion.updateMany).not.toHaveBeenCalled();
    expect(tx.promotionActivationOutbox.create).not.toHaveBeenCalled();
  });

  it.each([
    ['already active', { status: 'active' }],
    ['not started', { startsAt: new Date(NOW.getTime() + 1000) }],
    ['promotion window ended', { endsAt: NOW }],
    ['promotion type does not match package', { promotionType: 'listing_super_hot' }],
  ])('does not activate an ineligible promotion: %s', async (_label, promotion) => {
    const { service, tx } = setup({ enabled: true, promotion, dispatch: false });
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ activated: 0 });
    expect(tx.promotion.updateMany).not.toHaveBeenCalled();
    expect(tx.promotionActivationOutbox.create).not.toHaveBeenCalled();
  });

  it('does not transition if another worker already won the conditional claim', async () => {
    const { service, tx, notificationQueue, indexingQueue } = setup({ enabled: true, claimCount: 0, dispatch: false });
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ activated: 0 });
    expect(tx.promotionActivationOutbox.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(indexingQueue.add).not.toHaveBeenCalled();
  });

  it('uses the conditional database claim to prevent concurrent activation side effects', async () => {
    const context = setup({ enabled: true });
    context.tx.promotion.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      context.service.activateDuePromotions(NOW),
      context.service.activateDuePromotions(NOW),
    ]);

    expect(results.map((result) => result.activated).sort()).toEqual([0, 1]);
    expect(context.tx.promotionActivationOutbox.create).toHaveBeenCalledTimes(1);
    expect(context.tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(context.delivery.dispatchPending).toHaveBeenCalledTimes(2);
  });

  it('rechecks listing visibility and expiry only for promotion eligibility without changing listing lifecycle fields', async () => {
    const { service, tx } = setup({ enabled: true, dispatch: false });
    tx.listing.findFirst.mockResolvedValue(null);
    await expect(service.activateDuePromotions(NOW)).resolves.toMatchObject({ activated: 0 });
    expect(tx.listing.findFirst.mock.calls[0][0].where.AND).toEqual([{ OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }] }]);
    expect(tx.listing.updateMany).not.toHaveBeenCalled();
    expect(tx.promotionActivationOutbox.create).not.toHaveBeenCalled();
  });

  it('fails closed when the required outbox migration is not applied', async () => {
    const { service, prisma } = setup({ enabled: true });
    prisma.promotionActivationOutbox.findFirst.mockRejectedValue(new Error('missing relation'));
    await expect(service.activateDuePromotions(NOW)).rejects.toThrow('missing relation');
    expect(prisma.promotion.findMany).not.toHaveBeenCalled();
  });

  it('does not emit external side effects when the activation transaction fails', async () => {
    const { service, tx, notificationQueue, indexingQueue } = setup({ enabled: true, dispatch: false });
    tx.auditLog.create.mockRejectedValue(new Error('audit persistence failed'));
    await expect(service.activateDuePromotions(NOW)).rejects.toThrow('audit persistence failed');
    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(indexingQueue.add).not.toHaveBeenCalled();
  });
});
