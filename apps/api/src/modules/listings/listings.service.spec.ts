import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  it('creates a listing owned by the authenticated user', async () => {
    const createdListing = { id: 'listing-1', publicId: 'LST-123' };
    const prisma = {
      listing: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdListing),
      },
    };
    const service = new ListingsService(prisma as never, {} as never);

    const result = await service.create('user-1', {
      purposeId: '11111111-1111-4111-8111-111111111111',
      propertyTypeId: '22222222-2222-4222-8222-222222222222',
      cityId: '33333333-3333-4333-8333-333333333333',
      areaId: '44444444-4444-4444-8444-444444444444',
      title: 'Test listing for sale',
      description: 'A valid listing description for create flow diagnostics.',
      priceAmount: 1000000,
      areaValue: 10,
      areaUnit: 'marla',
    });

    expect(result).toBe(createdListing);
    expect(prisma.listing.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ownerUserId: 'user-1',
        purposeId: '11111111-1111-4111-8111-111111111111',
        propertyTypeId: '22222222-2222-4222-8222-222222222222',
        cityId: '33333333-3333-4333-8333-333333333333',
        areaId: '44444444-4444-4444-8444-444444444444',
      }),
    }));
  });

  it('does not infer WhatsApp consent from the general contact phone', async () => {
    const prisma = {
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          contactName: 'Seller',
          contactPhone: '+92 300 1234567',
          contactWhatsapp: null,
        }),
      },
    };
    const service = new ListingsService(prisma as never, {} as never);

    await expect(service.getContact('listing-1')).resolves.toEqual({
      contactName: 'Seller',
      contactPhone: '+92 300 1234567',
      whatsappUrl: undefined,
    });
  });

  it('returns WhatsApp only for an explicitly stored, valid WhatsApp number', async () => {
    const prisma = {
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          contactName: 'Seller',
          contactPhone: '+92 300 1234567',
          contactWhatsapp: '0300 7654321',
        }),
      },
    };
    const service = new ListingsService(prisma as never, {} as never);

    await expect(service.getContact('listing-1')).resolves.toMatchObject({
      whatsappUrl: 'https://wa.me/923007654321',
    });
  });
});
