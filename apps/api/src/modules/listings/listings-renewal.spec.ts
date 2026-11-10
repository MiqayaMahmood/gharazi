import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListingsService } from './listings.service';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-10T12:00:00.000Z');
const idempotencyKey = '33333333-3333-4333-8333-333333333333';
const ownerId = 'owner-1';
const owner = { id: 'owner-1', roles: [] } as never;

function setup(options: {
  listing?: Record<string, unknown> | null;
  recentRenewal?: { createdAt: Date } | null;
  idempotencyAudit?: Record<string, unknown> | null;
  updateCount?: number;
} = {}) {
  const listing = {
    id: 'listing-1',
    publicId: 'LST-1',
    ownerUserId: 'owner-1',
    managedByUserId: 'manager-1',
    status: 'active',
    expiresAt: new Date(now.getTime() + 10 * DAY),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...options.listing,
  };
  const auditRows: Array<Record<string, unknown>> = [];
  const tx = {
    listing: {
      findFirst: jest.fn().mockResolvedValue(options.listing === null ? null : listing),
      updateMany: jest.fn().mockResolvedValue({ count: options.updateCount ?? 1 }),
    },
    auditLog: {
      findFirst: jest.fn(async (args: any) => {
        if (args.where.metadataJson) {
          if (options.idempotencyAudit) return options.idempotencyAudit;
          return auditRows.find((row) => (row.metadataJson as Record<string, unknown>).idempotencyKey === args.where.metadataJson.equals) ?? null;
        }
        return options.recentRenewal && options.recentRenewal.createdAt > args.where.createdAt.gt ? options.recentRenewal : null;
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const audit = { metadataJson: data.metadataJson, createdAt: data.createdAt };
        auditRows.push(audit);
        return audit;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ now }]),
  };
  const prisma = {
    listing: {
      findFirst: jest.fn().mockResolvedValue(listing),
      update: jest.fn().mockResolvedValue(listing),
    },
    auditLog: {
      findFirst: jest.fn(async (args: any) => auditRows.find((row) => (row.metadataJson as Record<string, unknown>).idempotencyKey === args.where.metadataJson.equals) ?? null),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const indexing = { indexListing: jest.fn(), deleteListing: jest.fn() };
  return { service: new ListingsService(prisma as never, indexing as never), prisma, tx, indexing, listing, auditRows };
}

describe('ListingsService seller renewal', () => {
  it('renews within the 15-day window using the existing expiry plus 90 days and writes audit atomically', async () => {
    const { service, tx, indexing, listing } = setup();
    const result = await service.renew(owner, 'listing-1', idempotencyKey);

    expect(result).toEqual({
      listingId: 'listing-1',
      previousExpiresAt: listing.expiresAt.toISOString(),
      newExpiresAt: new Date(listing.expiresAt.getTime() + 90 * DAY).toISOString(),
      renewalTimestamp: now.toISOString(),
      replayed: false,
    });
    expect(tx.listing.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', deletedAt: null, expiresAt: listing.expiresAt }),
      data: { expiresAt: new Date(listing.expiresAt.getTime() + 90 * DAY), updatedAt: listing.updatedAt },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorUserId: ownerId,
      action: 'listing.renewed',
      entityType: 'listing',
      entityId: listing.id,
      createdAt: now,
      metadataJson: expect.objectContaining({ idempotencyKey, renewalSource: 'seller_dashboard', durationDays: 90 }),
    }) });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(indexing.indexListing).not.toHaveBeenCalled();
  });

  it('renews overdue ACTIVE listings from the database timestamp', async () => {
    const expiry = new Date(now.getTime() - 2 * DAY);
    const { service } = setup({ listing: { expiresAt: expiry } });
    const result = await service.renew(owner, 'listing-1', idempotencyKey);
    expect(result.newExpiresAt).toBe(new Date(now.getTime() + 90 * DAY).toISOString());
  });

  it('allows exactly 15 days remaining and rejects earlier requests without updating', async () => {
    const eligible = setup({ listing: { expiresAt: new Date(now.getTime() + 15 * DAY) } });
    await expect(eligible.service.renew(owner, 'listing-1', idempotencyKey)).resolves.toMatchObject({ replayed: false });

    const tooEarly = setup({ listing: { expiresAt: new Date(now.getTime() + 15 * DAY + 1) } });
    await expect(tooEarly.service.renew(owner, 'listing-1', idempotencyKey)).rejects.toBeInstanceOf(ConflictException);
    expect(tooEarly.tx.listing.updateMany).not.toHaveBeenCalled();
  });

  it('enforces the rolling 90-day cooldown', async () => {
    const { service, tx } = setup({ recentRenewal: { createdAt: new Date(now.getTime() - DAY) } });
    await expect(service.renew(owner, 'listing-1', idempotencyKey)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.listing.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('allows a request at the exact 90-day cooldown boundary', async () => {
    const { service, tx } = setup({ recentRenewal: { createdAt: new Date(now.getTime() - 90 * DAY) } });
    await service.renew(owner, 'listing-1', idempotencyKey);
    const recentQuery = tx.auditLog.findFirst.mock.calls[1][0];
    expect(recentQuery.where.createdAt.gt).toEqual(new Date(now.getTime() - 90 * DAY));
  });

  it('replays the durable audit result for a duplicate idempotency key', async () => {
    const stored = {
      metadataJson: {
        idempotencyKey,
        previousExpiresAt: '2026-11-20T12:00:00.000Z',
        newExpiresAt: '2027-02-18T12:00:00.000Z',
        renewalTimestamp: now.toISOString(),
        renewalSource: 'seller_dashboard',
        durationDays: 90,
      },
    };
    const { service, tx } = setup({ idempotencyAudit: stored });
    await expect(service.renew(owner, 'listing-1', idempotencyKey)).resolves.toEqual({
      listingId: 'listing-1',
      previousExpiresAt: stored.metadataJson.previousExpiresAt,
      newExpiresAt: stored.metadataJson.newExpiresAt,
      renewalTimestamp: stored.metadataJson.renewalTimestamp,
      replayed: true,
    });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.listing.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects concurrent requests that lose the expiry compare-and-set', async () => {
    const { service, tx, auditRows, prisma } = setup({ updateCount: 0 });
    prisma.auditLog.findFirst.mockResolvedValue(null);
    await expect(service.renew(owner, 'listing-1', idempotencyKey)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.listing.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(auditRows).toHaveLength(0);
  });

  it('concurrent duplicate requests commit one renewal and replay the committed audit', async () => {
    const { service, tx } = setup();
    let compareAndSetWon = false;
    tx.listing.updateMany.mockImplementation(async () => {
      if (compareAndSetWon) return { count: 0 };
      compareAndSetWon = true;
      return { count: 1 };
    });

    const results = await Promise.all([
      service.renew(owner, 'listing-1', idempotencyKey),
      service.renew(owner, 'listing-1', idempotencyKey),
    ]);

    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect(results.filter((result) => result.replayed)).toHaveLength(1);
    expect(tx.listing.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('rejects missing or invalid expiry without mutation', async () => {
    for (const expiresAt of [null, new Date(Number.NaN)]) {
      const { service, tx } = setup({ listing: { expiresAt } });
      await expect(service.renew(owner, 'listing-1', idempotencyKey)).rejects.toBeInstanceOf(ConflictException);
      expect(tx.listing.updateMany).not.toHaveBeenCalled();
    }
  });

  it.each(['draft', 'sold', 'rented', 'archived', 'expired', 'rejected', 'pending'])(
    'rejects %s listings without mutation', async (status) => {
      const { service, tx } = setup({ listing: { status } });
      await expect(service.renew(owner, 'listing-1', idempotencyKey)).rejects.toBeInstanceOf(ConflictException);
      expect(tx.listing.updateMany).not.toHaveBeenCalled();
    },
  );

  it('allows an authorized manager', async () => {
    const { service, tx } = setup();
    await service.renew({ id: 'manager-1', roles: [] } as never, 'listing-1', idempotencyKey);
    expect(tx.listing.findFirst.mock.calls[0][0].where.AND).toEqual([
      { OR: [{ ownerUserId: 'manager-1' }, { managedByUserId: 'manager-1' }] },
    ]);
  });

  it.each(['admin', 'moderator'])(
    'does not grant %s access by role alone', async (role) => {
      const { service, tx } = setup({ listing: null });
      await expect(service.renew({ id: `${role}-1`, roles: [role] } as never, 'listing-1', idempotencyKey))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.listing.updateMany).not.toHaveBeenCalled();
    },
  );

  it('does not change refresh semantics or enqueue indexing for renewal', async () => {
    const { service, prisma, indexing } = setup();
    await service.refresh(owner, 'listing-1');
    expect(prisma.listing.findFirst).toHaveBeenCalled();
    expect(indexing.indexListing).toHaveBeenCalledTimes(1);
    indexing.indexListing.mockClear();
    await service.renew(owner, 'listing-1', idempotencyKey);
    expect(indexing.indexListing).not.toHaveBeenCalled();
  });

  it('uses a serializable transaction for cooldown and compare-and-set', async () => {
    const { service, prisma } = setup();
    await service.renew(owner, 'listing-1', idempotencyKey);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('returns expiry and cooldown-based renewal eligibility for My Listings', async () => {
    const current = new Date();
    const recent = {
      id: 'recent',
      status: 'active',
      expiresAt: new Date(current.getTime() + 10 * DAY),
      updatedAt: current,
    };
    const eligible = {
      id: 'eligible',
      status: 'active',
      expiresAt: new Date(current.getTime() + 10 * DAY),
      updatedAt: current,
    };
    const prisma = {
      listing: { findMany: jest.fn().mockResolvedValue([recent, eligible]) },
      auditLog: {
        groupBy: jest.fn().mockResolvedValue([{ entityId: 'recent', _max: { createdAt: new Date(current.getTime() - 30 * DAY) } }]),
      },
    };
    const service = new ListingsService(prisma as never, {} as never);

    const rows = await service.listMine(ownerId);
    const first = rows[0] as unknown as typeof recent & { renewalEligible: boolean; renewalAvailableAt: Date | null };
    const second = rows[1] as unknown as typeof eligible & { renewalEligible: boolean; renewalAvailableAt: Date | null };
    expect(first).toMatchObject({ renewalEligible: false, expiresAt: recent.expiresAt });
    expect(first.renewalAvailableAt?.getTime()).toBeGreaterThan(current.getTime());
    expect(second).toMatchObject({ renewalEligible: true, expiresAt: eligible.expiresAt });
    expect(prisma.auditLog.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ action: 'listing.renewed', entityId: { in: ['recent', 'eligible'] } }),
    }));
  });
});
