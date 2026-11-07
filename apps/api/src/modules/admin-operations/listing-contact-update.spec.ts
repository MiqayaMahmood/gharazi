import { validate } from 'class-validator';
import { ListingContactUpdatesQueryDto } from './dto/listing-contact-update.dto';
import { AdminOperationsService } from './admin-operations.service';

const listing = {
  id: 'b12c3d45-e678-49ab-8cde-f01234567890',
  publicId: 'L-1',
  title: 'Alpha',
  status: 'published',
  contactName: 'Gharazi Admin',
  contactPhone: '+923001234567',
  contactWhatsapp: '+923009876543',
  sourceUrl: 'https://gharazi.com/listing',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  city: { name: 'Lahore' },
  area: { name: 'Gulberg' },
};

function makeService() {
  const prisma = {
    listing: {
      findMany: jest.fn().mockResolvedValue([listing]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...listing, ...data }),
      ),
    },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new AdminOperationsService(
    prisma as never,
    audit as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma };
}

describe('listing contact updates', () => {
  it.each(['asc', 'desc'] as const)('uses allowlisted stable title %s sorting', async (sortOrder) => {
    const { service, prisma } = makeService();

    await service.listingContactUpdates({ sortBy: 'title', sortOrder });

    expect(prisma.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: sortOrder }, { id: 'asc' }] }),
    );
  });

  it.each([
    ['sortBy', 'ownerUser'],
    ['sortOrder', 'sideways'],
  ])('rejects invalid %s query values', async (property, value) => {
    const dto = Object.assign(new ListingContactUpdatesQueryDto(), { [property]: value });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('preserves omitted phone and WhatsApp fields in a partial PATCH', async () => {
    const { service, prisma } = makeService();

    await service.updateListingContact('admin-id', listing.id, { contactName: '404' });

    expect(prisma.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: listing.id },
        data: { contactName: '404' },
      }),
    );
  });

  it('stores the exact 404 marker', async () => {
    const { service } = makeService();

    const updated = await service.updateListingContact('admin-id', listing.id, { contactName: '404' });

    expect(updated.contactName).toBe('404');
  });
});
