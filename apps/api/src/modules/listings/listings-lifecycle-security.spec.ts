import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ListingsService } from './listings.service';

const activeListing = { id: 'l-1', publicId: 'public-1', status: 'active', title: 'Home', description: 'Description', priceAmount: 10, areaValue: 2 };
const owner = { id: 'u-1', roles: [] } as never;

function setup(status: string) {
  const listing = { ...activeListing, status };
  const prisma = {
    listing: {
      findFirst: jest.fn().mockResolvedValue(listing),
      update: jest.fn().mockResolvedValue({ ...listing, status: 'active' }),
    },
    $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback({
      listing: { update: jest.fn().mockResolvedValue({ ...listing, status: 'active' }) },
      listingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    })),
  };
  const indexing = { indexListing: jest.fn(), deleteListing: jest.fn() };
  return { service: new ListingsService(prisma as never, indexing as never), prisma, indexing, listing };
}

describe('ListingsService lifecycle transition security', () => {
  it('allows a valid draft publish and indexes only after the transition', async () => {
    const { service, indexing, prisma } = setup('draft');
    await service.publish('u-1', 'l-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(indexing.indexListing).toHaveBeenCalledWith('l-1', 'public-1');
  });

  it.each(['active', 'sold', 'rented', 'archived', 'expired', 'rejected', 'pending'])(
    'rejects publishing from %s without mutation or indexing', async (status) => {
      const { service, indexing, prisma } = setup(status);
      await expect(service.publish('u-1', 'l-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(indexing.indexListing).not.toHaveBeenCalled();
    },
  );

  it.each(['sold', 'rented'] as const)('allows active -> %s', async (status) => {
    const { service, indexing, prisma } = setup('active');
    await service.markStatus(owner, 'l-1', status);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(indexing.indexListing).toHaveBeenCalledWith('l-1', 'public-1');
  });

  it.each(['draft', 'sold', 'rented', 'archived', 'expired', 'rejected', 'pending'])(
    'rejects sold/rented transition from %s before writes or indexing', async (status) => {
      const { service, indexing, prisma } = setup(status);
      await expect(service.markStatus(owner, 'l-1', 'sold')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(indexing.indexListing).not.toHaveBeenCalled();
    },
  );

  it('allows active refresh without changing status or expiry policy', async () => {
    const { service, prisma, indexing } = setup('active');
    await service.refresh(owner, 'l-1');
    expect(prisma.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: { lastRefreshedAt: expect.any(Date) } }));
    expect(indexing.indexListing).toHaveBeenCalledWith('l-1', 'public-1');
  });

  it('preserves authorized manager, administrator, and moderator management paths', async () => {
    const managerSetup = setup('active');
    await managerSetup.service.refresh({ id: 'manager-1', roles: [] } as never, 'l-1');
    expect(managerSetup.prisma.listing.findFirst.mock.calls[0][0].where.AND)
      .toEqual([{ OR: [{ ownerUserId: 'manager-1' }, { managedByUserId: 'manager-1' }] }]);

    for (const role of ['admin', 'moderator']) {
      const authorized = setup('active');
      await authorized.service.refresh({ id: `${role}-1`, roles: [role] } as never, 'l-1');
      expect(authorized.prisma.listing.findFirst.mock.calls[0][0].where).toEqual({
        OR: [{ id: 'l-1' }, { publicId: 'l-1' }], deletedAt: null,
      });
    }
  });

  it('rejects a user without owner, manager, admin, or moderator access', async () => {
    const { service, prisma, indexing } = setup('active');
    prisma.listing.findFirst.mockResolvedValue(null);
    await expect(service.refresh({ id: 'other-user', roles: [] } as never, 'l-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.listing.update).not.toHaveBeenCalled();
    expect(indexing.indexListing).not.toHaveBeenCalled();
  });

  it.each(['draft', 'sold', 'rented', 'archived', 'expired', 'rejected', 'pending'])(
    'rejects refresh from %s without mutation or indexing', async (status) => {
      const { service, prisma, indexing } = setup(status);
      await expect(service.refresh(owner, 'l-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.listing.update).not.toHaveBeenCalled();
      expect(indexing.indexListing).not.toHaveBeenCalled();
    },
  );

  it('allows draft and active archive; rejects terminal/moderation states', async () => {
    for (const status of ['draft', 'active']) {
      const { service, indexing } = setup(status);
      await service.archive(owner, 'l-1');
      expect(indexing.deleteListing).toHaveBeenCalledWith('l-1', 'public-1');
    }
    for (const status of ['sold', 'rented', 'rejected', 'pending']) {
      const { service, indexing, prisma } = setup(status);
      await expect(service.archive(owner, 'l-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(indexing.deleteListing).not.toHaveBeenCalled();
    }
  });
});
