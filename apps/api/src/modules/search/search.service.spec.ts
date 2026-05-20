import { SearchService } from './search.service';

describe('SearchService query mapping', () => {
  it('uses listing code and slug filters without treating them as IDs', async () => {
    const elasticsearch = {
      search: jest.fn().mockResolvedValue({ hits: { total: 0, hits: [] }, aggregations: {} }),
    };
    const service = new SearchService(elasticsearch as never, {} as never, enabledConfig() as never);

    await service.searchListings({
      purpose: 'buy',
      propertyTypeCode: 'commercial',
      citySlug: 'lahore',
      areaSlug: 'dha-phase-6-lahore',
    } as never);

    expect(elasticsearch.search).toHaveBeenCalledWith('listings', expect.objectContaining({
      query: expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            { term: { purposeCode: 'sale' } },
            { term: { propertyTypeCode: 'commercial' } },
            { term: { citySlug: 'lahore' } },
            { term: { areaSlug: 'dha-phase-6-lahore' } },
          ]),
        }),
      }),
    }));
  });

  it('uses project type code filters without treating them as IDs', async () => {
    const elasticsearch = {
      search: jest.fn().mockResolvedValue({ hits: { total: 0, hits: [] }, aggregations: {} }),
    };
    const service = new SearchService(elasticsearch as never, {} as never, enabledConfig() as never);

    await service.searchProjects({
      projectTypeCode: 'mixed-use',
      citySlug: 'karachi',
    } as never);

    expect(elasticsearch.search).toHaveBeenCalledWith('projects', expect.objectContaining({
      query: expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            { term: { projectTypeCode: 'mixed-use' } },
            { term: { citySlug: 'karachi' } },
          ]),
        }),
      }),
    }));
  });
});

function enabledConfig() {
  return { get: jest.fn((key: string) => (key === 'SEARCH_ENABLED' ? true : false)) };
}
