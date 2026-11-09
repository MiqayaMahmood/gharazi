import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { findPackage } from './package-catalog';

describe('PaymentsService promotion authorization', () => {
  const paidTransaction = {
    id: 'payment-1', userId: 'seller-1', entityType: 'listing', entityId: 'listing-1', provider: 'stripe',
    stripePaymentIntentId: 'pi-test', stripeCheckoutSessionId: null,
    packageCode: 'listing_hot', status: 'paid', paidAt: new Date(), metadataJson: { stripeEvent: 'evt-test' },
  };

  function activationSetup(existingPromotion: unknown = null) {
    let createdPromotion: any = existingPromotion;
    let currentMetadata: unknown = paidTransaction.metadataJson;
    const tx = {
      promotion: {
        findUnique: jest.fn().mockImplementation(async () => createdPromotion),
        create: jest.fn().mockImplementation(async ({ data }) => {
          createdPromotion ??= { ...data, id: 'promotion-1' };
          return createdPromotion;
        }),
      },
      listing: {
        findFirst: jest.fn().mockResolvedValue({ id: 'listing-1' }),
        update: jest.fn().mockResolvedValue({ id: 'listing-1', status: 'active', publicId: 'public-1' }),
      },
      project: { findFirst: jest.fn() },
    };
    const prisma = {
      paymentTransaction: {
        findUnique: jest.fn().mockImplementation(async () => ({ ...paidTransaction, metadataJson: currentMetadata })),
        findUniqueOrThrow: jest.fn().mockResolvedValue(paidTransaction),
        update: jest.fn().mockImplementation(async ({ data }) => {
          if (data.metadataJson) currentMetadata = data.metadataJson;
          return { ...paidTransaction, metadataJson: currentMetadata };
        }),
      },
      promotion: { findUnique: jest.fn().mockImplementation(async () => createdPromotion) },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(tx)),
    };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma as never, audit as never, { record: jest.fn() } as never);
    return { service, prisma, tx, audit };
  }

  it('accepts verified payment webhook activation for the authorized eligible target', async () => {
    const { service, tx } = activationSetup();
    await service.handleStripeEvent({
      id: 'evt-test', type: 'payment_intent.succeeded', data: { object: {
        id: 'pi-test', metadata: { paymentTransactionId: paidTransaction.id },
      } },
    } as never);

    expect(tx.listing.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: 'listing-1', status: 'active', publishedAt: { not: null }, deletedAt: null,
      OR: [{ ownerUserId: 'seller-1' }, { managedByUserId: 'seller-1' }],
    }), select: { id: true } });
    expect(tx.promotion.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      paymentTransactionId: paidTransaction.id, purchasedByUserId: 'seller-1', status: 'active',
    }) });
  });

  it('ignores a duplicate verified payment event when its promotion already exists', async () => {
    const { service, tx } = activationSetup({ id: 'existing-promotion' });
    await service.handleStripeEvent({
      id: 'evt-duplicate', type: 'payment_intent.succeeded', data: { object: {
        id: 'pi-test', metadata: { paymentTransactionId: paidTransaction.id },
      } },
    } as never);
    expect(tx.promotion.create).not.toHaveBeenCalled();
    expect(tx.listing.update).not.toHaveBeenCalled();
  });

  it('rejects a paid promotion target that is no longer eligible', async () => {
    const { service, tx } = activationSetup();
    tx.listing.findFirst.mockResolvedValue(null);
    await expect(service.handleStripeEvent({
      id: 'evt-ineligible', type: 'payment_intent.succeeded', data: { object: {
        id: 'pi-test', metadata: { paymentTransactionId: paidTransaction.id },
      } },
    } as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.promotion.create).not.toHaveBeenCalled();
    expect(tx.listing.update).not.toHaveBeenCalled();
  });

  it('rejects checkout eligibility for a listing the seller does not own or manage', async () => {
    const prisma = { listing: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new PaymentsService(prisma as never, {} as never, {} as never);
    await expect((service as any).validateTarget('seller-1', findPackage('listing_hot'), 'listing', 'listing-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.listing.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: 'listing-1', status: 'active', publishedAt: { not: null }, deletedAt: null,
    }) });
  });

  it('does not add expiry eligibility to checkout', async () => {
    const prisma = { listing: { findFirst: jest.fn().mockResolvedValue({ id: 'listing-1' }) } };
    const service = new PaymentsService(prisma as never, {} as never, {} as never);
    await (service as any).validateTarget('seller-1', findPackage('listing_hot'), 'listing', 'listing-1');
    expect(prisma.listing.findFirst.mock.calls[0][0].where).not.toHaveProperty('expiresAt');
  });

  it('lists only paid transactions marked for reconciliation', async () => {
    const prisma = {
      paymentTransaction: { findMany: jest.fn().mockResolvedValue([]) },
      promotion: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new PaymentsService(prisma as never, {} as never, {} as never);
    await service.listReconciliationRequired({ limit: 50 });
    expect(prisma.paymentTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'paid', metadataJson: { path: ['fulfillmentReconciliation', 'status'], equals: 'required' } },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: 51,
    }));
  });

  it('pages through more than 200 required payments without duplicate or missing IDs', async () => {
    const records = Array.from({ length: 205 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      userId: 'seller-1', entityType: 'listing', entityId: 'listing-1', packageCode: 'listing_hot',
      provider: 'stripe', stripeCheckoutSessionId: 'cs_verified', stripePaymentIntentId: null,
      status: 'paid', paidAt: new Date('2026-01-01T00:00:00Z'), amount: 1000, currency: 'PKR',
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      metadataJson: { fulfillmentReconciliation: { status: 'required', reasonCode: 'target_ineligible' } },
    }));
    const findMany = jest.fn(async (args: any) => {
      const start = args.cursor ? records.findIndex((row) => row.id === args.cursor.id) + 1 : 0;
      return records.slice(start, start + args.take);
    });
    const service = new PaymentsService({
      paymentTransaction: { findMany },
      promotion: { findMany: jest.fn().mockResolvedValue([]) },
    } as never, {} as never, {} as never);
    const ids: string[] = [];
    let cursor: string | undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const page = await service.listReconciliationRequired({ limit: 100, cursor });
      ids.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
      hasNextPage = page.hasNextPage;
      expect(page.items.every((item) => item.reconciliationStatus === 'required' && item.stripePaymentVerified)).toBe(true);
    }
    expect(ids).toEqual(records.map((row) => row.id));
    expect(new Set(ids).size).toBe(205);
    expect(findMany).toHaveBeenCalledTimes(3);
    expect(findMany.mock.calls[1][0]).toEqual(expect.objectContaining({ cursor: { id: records[99].id }, skip: 1 }));
  });

  it('rejects missing or unverified payment transactions before reconciliation', async () => {
    const { service, prisma } = activationSetup();
    prisma.paymentTransaction.findUnique.mockResolvedValueOnce(null);
    await expect(service.reconcile('missing-payment')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.paymentTransaction.findUnique.mockResolvedValueOnce({ ...paidTransaction, status: 'pending' });
    await expect(service.reconcile('payment-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.paymentTransaction.findUnique.mockResolvedValueOnce({ ...paidTransaction, stripePaymentIntentId: null, stripeCheckoutSessionId: null });
    await expect(service.reconcile('payment-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reconciles a verified eligible payment once without changing its paid state or refunding', async () => {
    const { service, prisma, tx } = activationSetup();
    const result = await service.reconcile('payment-1');
    expect(result).toMatchObject({ ok: true, status: 'paid', outcome: 'fulfilled', promotionId: 'promotion-1' });
    expect(tx.promotion.create).toHaveBeenCalledTimes(1);
    expect(prisma.paymentTransaction.update).toHaveBeenCalledTimes(2);
    for (const call of prisma.paymentTransaction.update.mock.calls) {
      expect(call[0].data).not.toHaveProperty('status');
      expect(call[0].data).not.toHaveProperty('refund');
      expect(call[0].data.metadataJson).toHaveProperty('stripeEvent', 'evt-test');
    }
  });

  it('returns already fulfilled for duplicate admin reconciliation without side effects', async () => {
    const { service, prisma, tx } = activationSetup({ id: 'promotion-1' });
    const result = await service.reconcile('payment-1');
    expect(result).toMatchObject({ outcome: 'already_fulfilled', promotionId: 'promotion-1' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.promotion.create).not.toHaveBeenCalled();
  });

  it('leaves an ineligible paid target unfulfilled and marks reconciliation required', async () => {
    const { service, prisma, tx } = activationSetup();
    tx.listing.findFirst.mockResolvedValue(null);
    await expect(service.reconcile('payment-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.promotion.create).not.toHaveBeenCalled();
    expect(prisma.paymentTransaction.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { metadataJson: expect.objectContaining({
        stripeEvent: 'evt-test',
        fulfillmentReconciliation: expect.objectContaining({ status: 'required', reasonCode: 'admin_retry_failed' }),
      }) },
    }));
  });

  it('does not create a second promotion when the verified webhook is repeated', async () => {
    const { service, tx } = activationSetup();
    const event = {
      id: 'evt-repeat', type: 'payment_intent.succeeded', data: { object: {
        id: 'pi-test', metadata: { paymentTransactionId: paidTransaction.id },
      } },
    } as never;
    await service.handleStripeEvent(event);
    await service.handleStripeEvent(event);
    expect(tx.promotion.create).toHaveBeenCalledTimes(1);
    expect(tx.listing.update).toHaveBeenCalledTimes(1);
  });
});
