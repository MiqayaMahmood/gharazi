import { AdminOperationsService } from './admin-operations.service';

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    $queryRaw: jest.fn(),
    listing: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    auditLog: { groupBy: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  const service = new AdminOperationsService(
    prisma as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
  );
  return { service, prisma };
}

describe('admin listing expiry preview', () => {
  it('returns aggregate metrics from one bounded database aggregate query', async () => {
    const { service, prisma } = createService({
      $queryRaw: jest.fn().mockResolvedValue([{
        totalListings: 140, activeListings: 100, approaching15Days: 15,
        approaching7Days: 7, approaching1Day: 1, overdue: 4,
        nullExpiry: 2, recentlyRenewed: 3,
      }]),
    });
    await expect(service.listingExpiryMetrics()).resolves.toEqual({
      totalListings: 140, activeListings: 100, approaching15Days: 15,
      approaching7Days: 7, approaching1Day: 1, overdue: 4,
      nullExpiry: 2, recentlyRenewed: 3, recentlyRenewedWindowDays: 90,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('filters upcoming windows inclusively at the upper boundary and excludes overdue rows', async () => {
    const now = new Date('2026-11-10T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const { service, prisma } = createService();
    await service.listingExpiryPreview({ bucket: 'within_7_days', page: 2, limit: 10 });
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', deletedAt: null, expiresAt: {
        gt: now,
        lte: new Date('2026-11-17T12:00:00.000Z'),
      } }),
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], skip: 10, take: 10,
    }));
    jest.useRealTimers();
  });

  it.each([
    ['overdue', { lt: expect.any(Date) }],
    ['null_expiry', null],
  ] as const)('applies the %s expiry classification', async (bucket, expected) => {
    const { service, prisma } = createService();
    await service.listingExpiryPreview({ bucket });
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', deletedAt: null, expiresAt: expected }),
    }));
  });

  it('returns only the requested page and derives renewal information from grouped audit history', async () => {
    const now = new Date();
    const listing = {
      id: 'listing-1', publicId: 'GZ-1', title: 'Example', ownerUserId: 'owner-12345678',
      status: 'active', expiresAt: new Date(now.getTime() + 10 * 86400000),
    };
    const lastRenewalAt = new Date(now.getTime() - 100 * 86400000);
    const { service, prisma } = createService({
      listing: {
        findMany: jest.fn().mockResolvedValue([listing]),
        count: jest.fn().mockResolvedValue(21),
      },
      auditLog: { groupBy: jest.fn().mockResolvedValue([{ entityId: listing.id, _max: { createdAt: lastRenewalAt } }]) },
    });
    const result = await service.listingExpiryPreview({ page: 2, limit: 10, q: 'GZ-1' });
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(prisma.auditLog.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['entityId'], where: expect.objectContaining({ entityId: { in: [listing.id] }, action: 'listing.renewed' }),
    }));
    expect(result).toMatchObject({ page: 2, limit: 10, total: 21, totalPages: 3 });
    expect(result.items[0]).toMatchObject({ lastRenewalAt, renewalEligible: true, daysOverdue: 0 });
  });

  it('keeps deleted and non-active listings out of the preview and represents null expiry as ineligible', async () => {
    const { service, prisma } = createService({
      listing: { findMany: jest.fn().mockResolvedValue([{
        id: 'listing-null', publicId: 'GZ-null', title: 'No deadline', ownerUserId: 'owner', status: 'active', expiresAt: null,
      }]), count: jest.fn().mockResolvedValue(1) },
    });
    const result = await service.listingExpiryPreview({ bucket: 'all_active' });
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'active', deletedAt: null },
    }));
    expect(result.items[0]).toMatchObject({ daysOverdue: 0, renewalEligible: false, renewalAvailableAt: null });
  });
});
