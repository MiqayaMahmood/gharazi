import { SearchService } from './search.service';

describe('SearchService query mapping', () => {
  it('maps residential to property type category IDs for Elasticsearch', async () => {
    const elasticsearch = elasticsearchMock();
    const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([{ id: 'house-id' }, { id: 'apartment-id' }]) } };
    const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

    await service.searchListings({ purpose: 'buy', propertyTypeCode: 'residential' } as never);

    expect(prisma.propertyType.findMany).toHaveBeenCalledWith({ where: { category: { equals: 'residential', mode: 'insensitive' } }, select: { id: true } });
    expect(listingFilters(elasticsearch)).toContainEqual({ terms: { propertyTypeId: ['house-id', 'apartment-id'] } });
  });

  it('maps commercial to property type category IDs for Elasticsearch', async () => {
    const elasticsearch = elasticsearchMock();
    const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([{ id: 'commercial-1' }, { id: 'commercial-2' }]) } };
    const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

    await service.searchListings({ purpose: 'buy', propertyTypeCode: 'commercial', citySlug: 'lahore', areaSlug: 'dha-phase-6-lahore' } as never);

    expect(prisma.propertyType.findMany).toHaveBeenCalledWith({ where: { category: { equals: 'commercial', mode: 'insensitive' } }, select: { id: true } });
    expect(listingFilters(elasticsearch)).toEqual(expect.arrayContaining([
      { term: { status: 'active' } },
      { term: { purposeSlug: 'sale' } },
      { terms: { propertyTypeId: ['commercial-1', 'commercial-2'] } },
      { term: { citySlug: 'lahore' } },
      { term: { areaSlug: 'dha-phase-6-lahore' } },
    ]));
  });

  it('maps plot to case-insensitive property type name IDs for Elasticsearch', async () => {
    const elasticsearch = elasticsearchMock();
    const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([{ id: 'plot-1' }]) } };
    const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

    await service.searchListings({ propertyTypeCode: 'plot' } as never);

    expect(prisma.propertyType.findMany).toHaveBeenCalledWith({ where: { name: { contains: 'plot', mode: 'insensitive' } }, select: { id: true } });
    expect(listingFilters(elasticsearch)).toContainEqual({ terms: { propertyTypeId: ['plot-1'] } });
  });

  it.each(['house', 'apartment', 'office', 'shop', 'upper_portion', 'lower_portion', 'residential_plot', 'commercial_plot'])('resolves lowercase and uppercase %s to the same property type ID', async (canonicalCode) => {
    for (const propertyTypeCode of [canonicalCode, canonicalCode.toUpperCase()]) {
      const elasticsearch = elasticsearchMock();
      const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([{ id: `${canonicalCode}-id` }]) } };
      const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

      await service.searchListings({ propertyTypeCode } as never);

      expect(prisma.propertyType.findMany).toHaveBeenCalledWith({ where: { code: { equals: canonicalCode, mode: 'insensitive' } }, select: { id: true } });
      expect(listingFilters(elasticsearch)).toContainEqual({ terms: { propertyTypeId: [`${canonicalCode}-id`] } });
    }
  });

  it.each(['warehouse', 'unknown_type'])('returns an impossible Elasticsearch filter when taxonomy code %s is absent', async (propertyTypeCode) => {
    const elasticsearch = elasticsearchMock();
    const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

    await service.searchListings({ propertyTypeCode } as never);

    expect(prisma.propertyType.findMany).toHaveBeenCalledWith({ where: { code: { equals: propertyTypeCode, mode: 'insensitive' } }, select: { id: true } });
    expect(listingFilters(elasticsearch)).toContainEqual({ bool: { must_not: [{ match_all: {} }] } });
  });

  it.each([
    ['residential', { category: { equals: 'residential', mode: 'insensitive' } }],
    ['commercial', { category: { equals: 'commercial', mode: 'insensitive' } }],
    ['plot', { name: { contains: 'plot', mode: 'insensitive' } }],
    ['house', { code: { equals: 'house', mode: 'insensitive' } }],
    ['HOUSE', { code: { equals: 'house', mode: 'insensitive' } }],
    ['apartment', { code: { equals: 'apartment', mode: 'insensitive' } }],
    ['office', { code: { equals: 'office', mode: 'insensitive' } }],
    ['shop', { code: { equals: 'shop', mode: 'insensitive' } }],
    ['warehouse', { code: { equals: 'warehouse', mode: 'insensitive' } }],
    ['upper_portion', { code: { equals: 'upper_portion', mode: 'insensitive' } }],
    ['unknown_type', { code: { equals: 'unknown_type', mode: 'insensitive' } }],
  ])('uses equivalent PostgreSQL classification for %s while retaining visibility filters', async (propertyTypeCode, propertyTypeWhere) => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { listing: { count, findMany }, $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)) };
    const service = new SearchService({} as never, prisma as never, fallbackConfig() as never);

    await service.searchListings({ purpose: 'buy', propertyTypeCode } as never);

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ status: 'active', deletedAt: null, purpose: { slug: 'sale' }, propertyType: propertyTypeWhere }) });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ propertyType: propertyTypeWhere }) }));
  });

  it.each([
    ['buy', 'sale'],
    ['rent', 'rent'],
  ])('keeps %s purpose separate from property classification', async (purpose, purposeSlug) => {
    const elasticsearch = elasticsearchMock();
    const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([{ id: 'house-id' }]) } };
    const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

    await service.searchListings({ purpose, propertyTypeCode: 'house' } as never);

    expect(listingFilters(elasticsearch)).toEqual(expect.arrayContaining([
      { term: { status: 'active' } },
      { term: { purposeSlug } },
      { terms: { propertyTypeId: ['house-id'] } },
    ]));
  });

  it.each([
    ['buy', 'sale'],
    ['rent', 'rent'],
  ])('uses the %s purpose slug in the PostgreSQL fallback', async (purpose, purposeSlug) => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { listing: { count, findMany }, $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)) };
    const service = new SearchService({} as never, prisma as never, fallbackConfig() as never);

    await service.searchListings({ purpose, propertyTypeCode: 'house' } as never);

    const expectedWhere = expect.objectContaining({
      status: 'active',
      deletedAt: null,
      purpose: { slug: purposeSlug },
      propertyType: { code: { equals: 'house', mode: 'insensitive' } },
    });
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
  });

  it('preserves result count, sorting, and pagination in the PostgreSQL fallback', async () => {
    const count = jest.fn().mockResolvedValue(42);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { listing: { count, findMany }, $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)) };
    const service = new SearchService({} as never, prisma as never, fallbackConfig() as never);

    const result = await service.searchListings({ purpose: 'buy', propertyTypeCode: 'residential', citySlug: 'lahore', page: 3, limit: 10, sort: 'price_low_high' } as never);

    expect(result.total).toBe(42);
    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ city: { slug: 'lahore' }, status: 'active', deletedAt: null, purpose: { slug: 'sale' }, propertyType: { category: { equals: 'residential', mode: 'insensitive' } } }) });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10, orderBy: [{ priceAmount: 'asc' }] }));
  });

  it('preserves Elasticsearch pagination and requested sort', async () => {
    const elasticsearch = elasticsearchMock();
    const prisma = { propertyType: { findMany: jest.fn().mockResolvedValue([{ id: 'office-id' }]) } };
    const service = new SearchService(elasticsearch as never, prisma as never, enabledConfig() as never);

    await service.searchListings({ propertyTypeCode: 'office', page: 3, limit: 10, sort: 'price_high_low' } as never);

    expect(elasticsearch.search).toHaveBeenCalledWith('listings', expect.objectContaining({ from: 20, size: 10, sort: [{ priceAmount: 'desc' }] }));
  });

  it('uses project type code filters without changing project search semantics', async () => {
    const elasticsearch = elasticsearchMock();
    const service = new SearchService(elasticsearch as never, {} as never, enabledConfig() as never);

    await service.searchProjects({ projectTypeCode: 'mixed-use', citySlug: 'karachi' } as never);

    expect(elasticsearch.search).toHaveBeenCalledWith('projects', expect.objectContaining({ query: expect.objectContaining({ bool: expect.objectContaining({ filter: expect.arrayContaining([
      { term: { projectTypeCode: 'mixed-use' } },
      { term: { citySlug: 'karachi' } },
    ]) }) }) }));
  });
});

function elasticsearchMock() {
  return { search: jest.fn().mockResolvedValue({ hits: { total: 0, hits: [] }, aggregations: {} }) };
}

function listingFilters(elasticsearch: ReturnType<typeof elasticsearchMock>) {
  return elasticsearch.search.mock.calls[0][1].query.bool.filter;
}

function enabledConfig() {
  return { get: jest.fn((key: string) => key === 'SEARCH_ENABLED') };
}

function fallbackConfig() {
  return { get: jest.fn((key: string) => key === 'SEARCH_DB_FALLBACK_ENABLED') };
}
