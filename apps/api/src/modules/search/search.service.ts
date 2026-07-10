import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '../../common/elasticsearch/elasticsearch.service';
import { PrismaService } from '../../database/prisma.service';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import { SearchProjectsQueryDto } from './dto/search-projects-query.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly degradedWarningTimestamps = new Map<string, number>();

  constructor(
    private readonly elasticsearch: ElasticsearchService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async searchListings(query: SearchListingsQueryDto) {
    if (!this.searchEnabled()) return this.searchListingsWithDbFallback(query, 'Search is disabled; using PostgreSQL fallback.');
    try {
      const filters = this.listingFilters(query);
      console.log("searchListings: ", filters);
      const sort = this.sort(query.sort, { price: 'priceAmount', area: 'areaValue' });
      const response = await this.elasticsearch.search('listings', {
        from: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        size: query.limit ?? 20,
        query: this.query(query.q, filters),
        sort,
        aggs: {
          cities: { terms: { field: 'cityId', size: 20 } },
          propertyTypes: { terms: { field: 'propertyTypeId', size: 20 } },
          propertyTypeCodes: { terms: { field: 'propertyTypeCode', size: 20 } },
          purposes: { terms: { field: 'purposeId', size: 10 } },
          purposeSlug: { terms: { field: 'slug', size: 10 } },
          priceRanges: { range: { field: 'priceAmount', ranges: [{ to: 5000000 }, { from: 5000000, to: 20000000 }, { from: 20000000 }] } },
        },
      });
      return this.format(response);
    } catch (error) {
      return this.searchListingsWithDbFallback(query, this.searchErrorMessage(error));
    }
  }

  async searchProjects(query: SearchProjectsQueryDto) {
    if (!this.searchEnabled()) return this.searchProjectsWithDbFallback(query, 'Search is disabled; using PostgreSQL fallback.');
    try {
      const filters = this.projectFilters(query);
      const response = await this.elasticsearch.search('projects', {
        from: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        size: query.limit ?? 20,
        query: this.query(query.q, filters),
        sort: this.sort(query.sort, { price: 'minPriceAmount', area: 'name.keyword' }),
        aggs: {
          cities: { terms: { field: 'cityId', size: 20 } },
          projectTypes: { terms: { field: 'projectTypeId', size: 20 } },
          projectTypeCodes: { terms: { field: 'projectTypeCode', size: 20 } },
          possession: { terms: { field: 'possessionStatus', size: 10 } },
        },
      });
      return this.format(response);
    } catch (error) {
      return this.searchProjectsWithDbFallback(query, this.searchErrorMessage(error));
    }
  }

  async autocompleteAreas(q: string) {
    try {
      const response = await this.elasticsearch.search('areas', {
        size: 10,
        query: q
          ? { match_bool_prefix: { searchText: q } }
          : { match_all: {} },
      });
      return this.format(response).items;
    } catch (error) {
      if (!this.dbFallbackEnabled()) throw new ServiceUnavailableException(`Search service unavailable: ${this.searchErrorMessage(error)}`);
      const areas = await this.prisma.area.findMany({
        where: q ? { isActive: true, OR: [{ name: { contains: q, mode: 'insensitive' } }, { city: { name: { contains: q, mode: 'insensitive' } } }] } : { isActive: true },
        include: { city: true },
        take: 10,
        orderBy: { sortOrder: 'asc' },
      });
      return areas.map((area) => ({ id: area.id, name: area.name, slug: area.slug, cityId: area.cityId, cityName: area.city.name, citySlug: area.city.slug }));
    }
  }

  async similarListings(id: string) {
    const base = await this.findBaseListing(id);
    if (!base) return [];
    if (!this.searchEnabled()) return this.similarListingsWithDbFallback(base);
    try {
      const response = await this.elasticsearch.search('listings', {
        size: 6,
        query: this.similarListingQuery(base),
        sort: [{ isFeatured: 'desc' }, { isHot: 'desc' }, { lastRefreshedAt: 'desc' }, { publishedAt: 'desc' }],
      });
      const items = this.format(response).items.filter((item: any) => item.id !== base.id && item.publicId !== base.publicId);
      if (items.length) return items;
      return this.similarListingsWithDbFallback(base);
    } catch {
      this.warnDegraded('similar-listings', 'Elasticsearch similar listings degraded; using PostgreSQL fallback.');
      return this.similarListingsWithDbFallback(base);
    }
  }

  async similarProjects(id: string) {
    if (!this.searchEnabled()) return this.similarProjectsWithDbFallback(id);
    try {
      const response = await this.elasticsearch.search('projects', {
        size: 8,
        query: {
          more_like_this: {
            fields: ['name', 'description', 'cityName', 'areaName', 'projectTypeCode'],
            like: [{ _index: this.elasticsearch.alias('projects'), _id: id }],
            min_term_freq: 1,
            min_doc_freq: 1,
          },
        },
      });
      return this.format(response).items;
    } catch {
      this.warnDegraded('similar-projects', 'Elasticsearch similar projects degraded; using PostgreSQL fallback.');
      return this.similarProjectsWithDbFallback(id);
    }
  }

  private query(q: string | undefined, filter: unknown[]) {
    return {
      bool: {
        must: q ? [{ multi_match: { query: q, fields: ['title^3', 'name^3', 'description', 'cityName', 'areaName'] } }] : [{ match_all: {} }],
        filter,
      },
    };
  }

  private listingFilters(query: SearchListingsQueryDto) {
    const filter: unknown[] = [{ term: { status: 'active' } }];
    this.term(filter, 'cityId', query.cityId);
    this.term(filter, 'citySlug', query.citySlug);
    this.term(filter, 'areaId', query.areaId);
    this.term(filter, 'areaSlug', query.areaSlug);
    this.term(filter, 'purposeId', query.purposeId);
    this.term(filter, 'purposeSlug', this.listingPurposeSlug(query));
    this.term(filter, 'propertyTypeId', query.propertyTypeId);
    this.term(filter, 'propertyTypeCode', query.propertyTypeCode);
    this.term(filter, 'bedrooms', query.bedrooms);
    this.term(filter, 'bathrooms', query.bathrooms);
    this.term(filter, 'furnishedStatus', query.furnishedStatus);
    if (query.verifiedOnly) this.term(filter, 'verificationStatus', 'verified');
    this.range(filter, 'priceAmount', query.minPrice, query.maxPrice);
    this.range(filter, 'areaValue', query.minArea, query.maxArea);
    this.geo(filter, query);
    return filter;
  }

  private projectFilters(query: SearchProjectsQueryDto) {
    const filter: unknown[] = [{ term: { status: 'active' } }];
    this.term(filter, 'cityId', query.cityId);
    this.term(filter, 'citySlug', query.citySlug);
    this.term(filter, 'areaId', query.areaId);
    this.term(filter, 'areaSlug', query.areaSlug);
    this.term(filter, 'projectTypeId', query.projectTypeId);
    this.term(filter, 'projectTypeCode', query.projectTypeCode ?? query.propertyTypeCode);
    this.term(filter, 'possessionStatus', query.possessionStatus);
    this.term(filter, 'legalStatus', query.legalStatus);
    this.range(filter, 'minPriceAmount', query.minPrice, query.maxPrice);
    this.geo(filter, query);
    return filter;
  }

  private term(filter: unknown[], field: string, value: unknown) {
    if (value !== undefined && value !== null && value !== '') filter.push({ term: { [field]: value } });
  }

  private listingPurposeSlug(query: SearchListingsQueryDto) {
    console.log("query.purposeSlug: ", query.purposeSlug);

    const value = query.purposeSlug ?? query.purpose;
    if (value === 'buy') return 'sale';
    if (value === 'Buy') return 'sale';
    if (value === 'FOR_SALE') return 'sale';
    if (value === 'Sale') return 'sale';
    if (value === 'FOR_RENT') return 'rent';
    if (value === 'Rent') return 'rent';
    if (value === 'rent') return 'rent';
    return value;
  }

  private range(filter: unknown[], field: string, gte?: number, lte?: number) {
    if (gte !== undefined || lte !== undefined) filter.push({ range: { [field]: { gte, lte } } });
  }

  private geo(
    filter: unknown[],
    query: { north?: number; south?: number; east?: number; west?: number; lat?: number; lng?: number; radiusKm?: number },
  ) {
    if (
      query.north !== undefined &&
      query.south !== undefined &&
      query.east !== undefined &&
      query.west !== undefined
    ) {
      filter.push({
        geo_bounding_box: {
          geoLocation: {
            top_left: { lat: query.north, lon: query.west },
            bottom_right: { lat: query.south, lon: query.east },
          },
        },
      });
    } else if (query.lat !== undefined && query.lng !== undefined && query.radiusKm !== undefined) {
      filter.push({
        geo_distance: {
          distance: `${query.radiusKm}km`,
          geoLocation: { lat: query.lat, lon: query.lng },
        },
      });
    }
  }

  private sort(sort = 'relevant', fields: { price: string; area: string }) {
    if (sort === 'newest') return [{ publishedAt: 'desc' }];
    if (sort === 'price_low_high') return [{ [fields.price]: 'asc' }];
    if (sort === 'price_high_low') return [{ [fields.price]: 'desc' }];
    if (sort === 'area_low_high') return [{ [fields.area]: 'asc' }];
    if (sort === 'area_high_low') return [{ [fields.area]: 'desc' }];
    return ['_score', { publishedAt: 'desc' }];
  }

  private async searchListingsWithDbFallback(query: SearchListingsQueryDto, reason: string) {
    if (!this.dbFallbackEnabled()) throw new ServiceUnavailableException(`Search service unavailable: ${reason}`);
    this.warnDegraded('listings-search', `Elasticsearch listings search degraded; using PostgreSQL fallback. ${reason}`);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      status: 'active',
      deletedAt: null,
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.citySlug ? { city: { slug: query.citySlug } } : {}),
      ...(query.areaId ? { areaId: query.areaId } : {}),
      ...(query.areaSlug ? { area: { slug: query.areaSlug } } : {}),
      ...(query.purposeId ? { purposeId: query.purposeId } : {}),
      ...(this.listingPurposeSlug(query) ? { purpose: { code: this.listingPurposeSlug(query) } } : {}),
      ...(query.propertyTypeId ? { propertyTypeId: query.propertyTypeId } : {}),
      ...(query.propertyTypeCode ? { propertyType: { code: query.propertyTypeCode } } : {}),
      ...(query.bedrooms !== undefined ? { bedrooms: query.bedrooms } : {}),
      ...(query.bathrooms !== undefined ? { bathrooms: query.bathrooms } : {}),
      ...(query.furnishedStatus ? { furnishedStatus: query.furnishedStatus } : {}),
      ...(query.verifiedOnly ? { verificationStatus: 'verified' } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { priceAmount: { gte: query.minPrice, lte: query.maxPrice } } : {}),
      ...(query.minArea !== undefined || query.maxArea !== undefined ? { areaValue: { gte: query.minArea, lte: query.maxArea } } : {}),
      ...(query.q ? {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' as const } },
          { description: { contains: query.q, mode: 'insensitive' as const } },
          { city: { name: { contains: query.q, mode: 'insensitive' as const } } },
          { area: { name: { contains: query.q, mode: 'insensitive' as const } } },
        ],
      } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        include: {
          city: true,
          area: true,
          purpose: true,
          propertyType: true,
          media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          amenities: { include: { amenity: true } },
        },
        orderBy: this.dbListingSort(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      total,
      items: items.map((listing) => ({
        id: listing.id,
        publicId: listing.publicId,
        title: listing.title,
        description: listing.description,
        priceAmount: Number(listing.priceAmount),
        cityName: listing.city.name,
        citySlug: listing.city.slug,
        areaName: listing.area.name,
        areaSlug: listing.area.slug,
        propertyTypeName: listing.propertyType.name,
        purposeSlug: listing.purpose.slug,
        bedrooms: listing.bedrooms ?? undefined,
        bathrooms: listing.bathrooms ?? undefined,
        areaValue: Number(listing.areaValue),
        areaUnit: listing.areaUnit,
        coverImageUrl: listing.media[0]?.url,
        verificationStatus: listing.verificationStatus,
        isFeatured: listing.isFeatured,
        isHot: listing.isHot,
        updatedAt: listing.updatedAt.toISOString(),
        publishedAt: listing.publishedAt?.toISOString(),
        amenities: listing.amenities.map((item) => item.amenity.name),
      })),
      aggregations: {},
      degraded: true,
      source: 'postgres_fallback',
      searchAvailable: false,
      message: 'Search is temporarily using PostgreSQL fallback because Elasticsearch is unavailable.',
    };
  }

  private async searchProjectsWithDbFallback(query: SearchProjectsQueryDto, reason: string) {
    if (!this.dbFallbackEnabled()) throw new ServiceUnavailableException(`Search service unavailable: ${reason}`);
    this.warnDegraded('projects-search', `Elasticsearch projects search degraded; using PostgreSQL fallback. ${reason}`);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const projectTypeCode = query.projectTypeCode ?? query.propertyTypeCode;
    const where = {
      status: 'active',
      deletedAt: null,
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.citySlug ? { city: { slug: query.citySlug } } : {}),
      ...(query.areaId ? { areaId: query.areaId } : {}),
      ...(query.areaSlug ? { area: { slug: query.areaSlug } } : {}),
      ...(query.projectTypeId ? { projectTypeId: query.projectTypeId } : {}),
      ...(projectTypeCode ? { projectType: { code: projectTypeCode } } : {}),
      ...(query.possessionStatus ? { possessionStatus: query.possessionStatus } : {}),
      ...(query.legalStatus ? { legalStatus: query.legalStatus } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { minPriceAmount: { gte: query.minPrice, lte: query.maxPrice } } : {}),
      ...(query.q ? {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' as const } },
          { description: { contains: query.q, mode: 'insensitive' as const } },
          { city: { name: { contains: query.q, mode: 'insensitive' as const } } },
          { area: { name: { contains: query.q, mode: 'insensitive' as const } } },
        ],
      } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        include: {
          developer: true,
          city: true,
          area: true,
          projectType: true,
          media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          amenities: { include: { amenity: true } },
          units: { include: { propertyType: true }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: this.dbProjectSort(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      total,
      items: items.map((project) => ({
        id: project.id,
        publicId: project.publicId,
        slug: project.slug,
        name: project.name,
        description: project.description,
        developerName: project.developer.companyName,
        cityName: project.city.name,
        citySlug: project.city.slug,
        areaName: project.area.name,
        areaSlug: project.area.slug,
        projectTypeName: project.projectType.name,
        possessionStatus: project.possessionStatus,
        legalStatus: project.legalStatus ?? undefined,
        verificationStatus: project.verificationStatus,
        minPriceAmount: project.minPriceAmount ? Number(project.minPriceAmount) : undefined,
        maxPriceAmount: project.maxPriceAmount ? Number(project.maxPriceAmount) : undefined,
        coverImageUrl: project.media[0]?.url,
        launchDate: project.launchDate?.toISOString(),
        expectedHandoverDate: project.expectedHandoverDate?.toISOString(),
        paymentPlanSummary: project.paymentPlanSummary ?? undefined,
        amenities: project.amenities.map((item) => item.amenity.name),
        units: project.units.map((unit) => ({
          id: unit.id,
          type: unit.propertyType.name,
          size: unit.areaValue && unit.areaUnit ? `${Number(unit.areaValue)} ${unit.areaUnit}` : '',
          price: unit.minPriceAmount ? Number(unit.minPriceAmount) : undefined,
        })),
      })),
      aggregations: {},
      degraded: true,
      source: 'postgres_fallback',
      searchAvailable: false,
      message: 'Search is temporarily using PostgreSQL fallback because Elasticsearch is unavailable.',
    };
  }

  private async findBaseListing(id: string) {
    return this.prisma.listing.findFirst({
      where: { OR: [{ id }, { publicId: id }], deletedAt: null },
      select: {
        id: true,
        publicId: true,
        cityId: true,
        areaId: true,
        propertyTypeId: true,
        purposeId: true,
        priceAmount: true,
        areaValue: true,
      },
    });
  }

  private async similarListingsWithDbFallback(baseOrId: any) {
    if (!this.dbFallbackEnabled()) return [];
    const base = typeof baseOrId === 'string' ? await this.findBaseListing(baseOrId) : baseOrId;
    if (!base) return [];
    const strict = await this.findSimilarListings(base, true);
    if (strict.length) return strict.map((listing) => this.mapListing(listing));
    const relaxed = await this.findSimilarListings(base, false);
    return relaxed.map((listing) => this.mapListing(listing));
  }

  private async findSimilarListings(base: { id: string; cityId: string; areaId: string; propertyTypeId: string; purposeId: string; priceAmount?: unknown; areaValue?: unknown }, strict: boolean) {
    const priceRange = this.percentRange(base.priceAmount, 0.25);
    const areaRange = this.percentRange(base.areaValue, 0.25);
    return this.prisma.listing.findMany({
      where: {
        id: { not: base.id },
        status: 'active',
        deletedAt: null,
        cityId: base.cityId,
        purposeId: base.purposeId,
        ...(strict ? { areaId: base.areaId, propertyTypeId: base.propertyTypeId } : {}),
        ...(priceRange ? { priceAmount: { gte: priceRange.gte, lte: priceRange.lte } } : {}),
        ...(areaRange ? { areaValue: { gte: areaRange.gte, lte: areaRange.lte } } : {}),
      },
      include: {
        city: true,
        area: true,
        purpose: true,
        propertyType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        amenities: { include: { amenity: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { isHot: 'desc' }, { lastRefreshedAt: 'desc' }, { publishedAt: 'desc' }],
      take: 6,
    });
  }

  private async similarProjectsWithDbFallback(id: string) {
    if (!this.dbFallbackEnabled()) return [];
    const base = await this.prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }, { publicId: id }], deletedAt: null },
      select: { id: true, developerId: true, cityId: true, projectTypeId: true },
    });
    if (!base) return [];

    const strict = await this.findSimilarProjects(base, true);
    if (strict.length) return strict.map((project) => this.mapProject(project));
    const relaxed = await this.findSimilarProjects(base, false);
    return relaxed.map((project) => this.mapProject(project));
  }

  private async findSimilarProjects(base: { id: string; developerId: string; cityId: string; projectTypeId: string }, strict: boolean) {
    return this.prisma.project.findMany({
      where: {
        id: { not: base.id },
        status: 'active',
        deletedAt: null,
        cityId: base.cityId,
        ...(strict ? { projectTypeId: base.projectTypeId } : {}),
      },
      include: {
        developer: true,
        city: true,
        area: true,
        projectType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        amenities: { include: { amenity: true } },
        units: { include: { propertyType: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: 8,
    });
  }

  private dbListingSort(sort = 'relevant') {
    if (sort === 'price_low_high') return [{ priceAmount: 'asc' as const }];
    if (sort === 'price_high_low') return [{ priceAmount: 'desc' as const }];
    if (sort === 'area_low_high') return [{ areaValue: 'asc' as const }];
    if (sort === 'area_high_low') return [{ areaValue: 'desc' as const }];
    return [{ publishedAt: 'desc' as const }, { updatedAt: 'desc' as const }];
  }

  private dbProjectSort(sort = 'relevant') {
    if (sort === 'price_low_high') return [{ minPriceAmount: 'asc' as const }];
    if (sort === 'price_high_low') return [{ minPriceAmount: 'desc' as const }];
    return [{ publishedAt: 'desc' as const }, { updatedAt: 'desc' as const }];
  }

  private searchEnabled() {
    return this.configFlag('SEARCH_ENABLED', true);
  }

  private dbFallbackEnabled() {
    return this.configFlag('SEARCH_DB_FALLBACK_ENABLED', true);
  }

  private configFlag(key: string, defaultValue: boolean) {
    const value = this.config.get<boolean | string>(key);
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return value.toLowerCase() === 'true';
  }

  private searchErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private warnDegraded(key: string, message: string) {
    const now = Date.now();
    const last = this.degradedWarningTimestamps.get(key) ?? 0;
    if (now - last < 60_000) return;
    this.degradedWarningTimestamps.set(key, now);
    this.logger.warn(message);
  }

  private mapListing(listing: any) {
    return {
      id: listing.id,
      publicId: listing.publicId,
      title: listing.title,
      description: listing.description,
      priceAmount: Number(listing.priceAmount),
      cityId: listing.cityId,
      cityName: listing.city.name,
      citySlug: listing.city.slug,
      areaId: listing.areaId,
      areaName: listing.area.name,
      areaSlug: listing.area.slug,
      propertyTypeId: listing.propertyTypeId,
      propertyTypeName: listing.propertyType.name,
      purposeId: listing.purposeId,
      purposeSlug: listing.purpose.slug,
      bedrooms: listing.bedrooms ?? undefined,
      bathrooms: listing.bathrooms ?? undefined,
      areaValue: Number(listing.areaValue),
      areaUnit: listing.areaUnit,
      coverImageUrl: listing.media[0]?.url,
      verificationStatus: listing.verificationStatus,
      isFeatured: listing.isFeatured,
      isHot: listing.isHot,
      updatedAt: listing.updatedAt.toISOString(),
      publishedAt: listing.publishedAt?.toISOString(),
      amenities: listing.amenities.map((item: any) => item.amenity.name),
    };
  }

  private mapProject(project: any) {
    return {
      id: project.id,
      publicId: project.publicId,
      slug: project.slug,
      name: project.name,
      description: project.description,
      developerName: project.developer.companyName,
      cityName: project.city.name,
      citySlug: project.city.slug,
      areaName: project.area.name,
      areaSlug: project.area.slug,
      projectTypeName: project.projectType.name,
      possessionStatus: project.possessionStatus,
      legalStatus: project.legalStatus ?? undefined,
      verificationStatus: project.verificationStatus,
      minPriceAmount: project.minPriceAmount ? Number(project.minPriceAmount) : undefined,
      maxPriceAmount: project.maxPriceAmount ? Number(project.maxPriceAmount) : undefined,
      coverImageUrl: project.media[0]?.url,
      launchDate: project.launchDate?.toISOString(),
      expectedHandoverDate: project.expectedHandoverDate?.toISOString(),
      paymentPlanSummary: project.paymentPlanSummary ?? undefined,
      amenities: project.amenities.map((item: any) => item.amenity.name),
      units: project.units?.map((unit: any) => ({
        id: unit.id,
        type: unit.propertyType.name,
        size: unit.areaValue && unit.areaUnit ? `${Number(unit.areaValue)} ${unit.areaUnit}` : '',
        price: unit.minPriceAmount ? Number(unit.minPriceAmount) : undefined,
      })),
    };
  }

  private format(response: any) {
    return {
      total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0,
      items: response.hits.hits.map((hit: any) => this.stripSourceFields({ id: hit._id, score: hit._score, ...hit._source })),
      aggregations: response.aggregations ?? {},
    };
  }

  private stripSourceFields(input: Record<string, unknown>) {
    const output = { ...input };
    [
      'source_listing_id',
      'sourceListingId',
      'provider_id',
      'providerId',
      'source_url',
      'sourceUrl',
      'external_id',
      'externalId',
      'source_id',
      'sourceId',
      'imported_from',
      'importedFrom',
      'provider',
      'scraper_source',
      'scraperSource',
    ].forEach((key) => delete output[key]);
    return output;
  }

  private similarListingQuery(base: { id: string; publicId?: string; cityId: string; areaId: string; propertyTypeId: string; purposeId: string; priceAmount?: unknown; areaValue?: unknown }) {
    const filter: unknown[] = [
      { term: { status: 'active' } },
      { term: { purposeId: base.purposeId } },
      { term: { cityId: base.cityId } },
    ];
    const priceRange = this.percentRange(base.priceAmount, 0.25);
    const areaRange = this.percentRange(base.areaValue, 0.25);
    if (priceRange) filter.push({ range: { priceAmount: priceRange } });
    if (areaRange) filter.push({ range: { areaValue: areaRange } });

    return {
      bool: {
        filter,
        must_not: [{ ids: { values: [base.id, base.publicId].filter(Boolean) } }],
        should: [
          { term: { areaId: { value: base.areaId, boost: 3 } } },
          { term: { propertyTypeId: { value: base.propertyTypeId, boost: 2 } } },
        ],
      },
    };
  }

  private percentRange(value: unknown, ratio: number) {
    if (value === undefined || value === null) return undefined;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    return { gte: numeric * (1 - ratio), lte: numeric * (1 + ratio) };
  }
}
