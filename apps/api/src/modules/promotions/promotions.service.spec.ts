import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

describe('PromotionsService security boundaries', () => {
  const promotion = { id: 'promotion-1', purchasedByUserId: 'seller-1', entityType: 'listing', entityId: 'listing-1', status: 'active' };
  const grantDto = {
    idempotencyKey: '11111111-1111-4111-8111-111111111111', listingId: '22222222-2222-4222-8222-222222222222',
    promotionType: 'listing_hot', durationDays: 14, reason: 'Customer service goodwill grant',
  };
  function setup() {
    const grantedListing = { id: grantDto.listingId, ownerUserId: 'listing-owner', status: 'active', publicId: 'PUB-1' };
    const tx = {
      listing: {
        findFirst: jest.fn().mockResolvedValue(grantedListing),
        update: jest.fn().mockResolvedValue(grantedListing),
      },
      promotion: { create: jest.fn(async ({ data }) => ({ ...data, startsAt: new Date(data.startsAt), endsAt: new Date(data.endsAt) })) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      promotion: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(promotion),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(promotion),
      },
      paymentTransaction: { findUnique: jest.fn() },
      listing: { findFirst: jest.fn(), update: jest.fn() },
      auditLog: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const audit = { record: jest.fn() };
    const indexing = { indexListing: jest.fn() };
    return { service: new PromotionsService(prisma as never, audit as never, {} as never, indexing as never), prisma, audit, tx, indexing, grantedListing };
  }

  it('rejects direct seller promotion creation without touching persistence', async () => {
    const { service, prisma } = setup();
    await expect(service.create('seller-1', {
      entityType: 'listing', entityId: 'listing-1', promotionType: 'featured',
      startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(),
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.promotion.create).not.toHaveBeenCalled();
  });

  it.each(['entityId', 'entityType', 'promotionType', 'startsAt', 'endsAt', 'status', 'isFeatured', 'paymentTransactionId', 'purchasedByUserId'])(
    'rejects client mutation of promotion %s without persistence', async (field) => {
      const { service, prisma, audit } = setup();
      await expect(service.update('seller-1', promotion.id, { [field]: 'attacker-value' } as never))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.promotion.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    },
  );

  it('allows the purchaser to update notes only', async () => {
    const { service, prisma } = setup();
    await service.update('seller-1', promotion.id, { notes: 'seller note' });
    expect(prisma.promotion.update).toHaveBeenCalledWith({ where: { id: promotion.id }, data: { notes: 'seller note' } });
  });

  it('creates an admin grant with audit evidence and no payment linkage', async () => {
    const { service, tx, indexing } = setup();
    const result = await service.grantAdminPromotion('admin-1', grantDto);
    expect(result.replayed).toBe(false);
    expect(tx.listing.findFirst.mock.calls[0][0].where).not.toHaveProperty('expiresAt');
    expect(tx.promotion.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      id: grantDto.idempotencyKey, entityId: grantDto.listingId, promotionType: grantDto.promotionType,
      paymentTransactionId: null, packageCode: null, notes: grantDto.reason,
      purchasedByUserId: 'listing-owner', status: 'active', isHot: true,
    }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorUserId: 'admin-1', action: 'promotion.admin_grant', entityId: grantDto.idempotencyKey,
      metadataJson: expect.objectContaining({
        idempotencyKey: grantDto.idempotencyKey, listingId: grantDto.listingId,
        durationDays: 14, reason: grantDto.reason, recipientUserId: 'listing-owner',
      }),
    }) });
    expect(tx.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isHot: true } }));
    expect(indexing.indexListing).toHaveBeenCalledWith(grantDto.listingId, 'PUB-1');
  });

  it('rejects an ineligible grant target without creating an audit or promotion', async () => {
    const { service, tx } = setup();
    tx.listing.findFirst.mockResolvedValue(null);
    await expect(service.grantAdminPromotion('admin-1', grantDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.promotion.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects a missing or whitespace-only reason', async () => {
    const { service, tx } = setup();
    await expect(service.grantAdminPromotion('admin-1', { ...grantDto, reason: '         ' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.promotion.create).not.toHaveBeenCalled();
  });

  it('requires grant duration to match a supported package and rejects unsupported types', async () => {
    const { service, tx } = setup();
    await expect(service.grantAdminPromotion('admin-1', { ...grantDto, durationDays: 30 }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.grantAdminPromotion('admin-1', { ...grantDto, promotionType: 'homepage_banner' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.promotion.create).not.toHaveBeenCalled();
  });

  it('returns the existing grant for the same idempotency key and request', async () => {
    const { service, prisma, tx } = setup();
    const existing = {
      id: grantDto.idempotencyKey, entityType: 'listing', entityId: grantDto.listingId,
      promotionType: grantDto.promotionType, paymentTransactionId: null, notes: grantDto.reason,
      startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-01-15T00:00:00.000Z'),
    };
    prisma.promotion.findUnique.mockResolvedValue(existing);
    prisma.auditLog.findFirst.mockResolvedValue({ metadataJson: {
      idempotencyKey: grantDto.idempotencyKey, listingId: grantDto.listingId,
      promotionType: grantDto.promotionType, durationDays: 14, reason: grantDto.reason,
    } });
    const result = await service.grantAdminPromotion('admin-1', grantDto);
    expect(result).toEqual({ promotion: existing, replayed: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.promotion.create).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key for a different request', async () => {
    const { service, prisma, tx } = setup();
    prisma.promotion.findUnique.mockResolvedValue({ ...promotion, id: grantDto.idempotencyKey, paymentTransactionId: null });
    prisma.auditLog.findFirst.mockResolvedValue({ metadataJson: { listingId: 'different-listing' } });
    await expect(service.grantAdminPromotion('admin-1', grantDto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.promotion.create).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent grants through the promotion primary key', async () => {
    const context = setup();
    let persisted: any;
    let preflightCalls = 0;
    let releasePreflight!: () => void;
    const bothPreflightReads = new Promise<void>((resolve) => { releasePreflight = resolve; });
    context.prisma.promotion.findUnique.mockImplementation(async () => {
      preflightCalls += 1;
      if (preflightCalls <= 2) {
        if (preflightCalls === 2) releasePreflight();
        await bothPreflightReads;
        return null;
      }
      return persisted ?? null;
    });
    context.prisma.auditLog.findFirst.mockResolvedValue({ metadataJson: {
      idempotencyKey: grantDto.idempotencyKey, listingId: grantDto.listingId,
      promotionType: grantDto.promotionType, durationDays: 14, reason: grantDto.reason,
    } });
    context.tx.promotion.create.mockImplementation(async ({ data }) => {
      if (persisted) throw { code: 'P2002' };
      persisted = { ...data, startsAt: new Date(data.startsAt), endsAt: new Date(data.endsAt) };
      return persisted;
    });
    const [first, second] = await Promise.all([
      context.service.grantAdminPromotion('admin-1', grantDto),
      context.service.grantAdminPromotion('admin-1', grantDto),
    ]);
    expect([first.replayed, second.replayed].sort()).toEqual([false, true]);
    expect(context.tx.promotion.create).toHaveBeenCalledTimes(2);
    expect(context.tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
