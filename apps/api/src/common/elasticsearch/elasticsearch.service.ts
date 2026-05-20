import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';

export const SEARCH_ALIASES = {
  listings: 'listings_current',
  projects: 'projects_current',
  areas: 'areas_current',
} as const;

const SEARCH_PHYSICAL_INDEX_BASE = {
  listings: 'listings',
  projects: 'projects',
  areas: 'areas',
} as const;

@Injectable()
export class ElasticsearchService {
  constructor(
    @Inject(ELASTICSEARCH_CLIENT) readonly client: Client,
    private readonly config: ConfigService,
  ) {}

  alias(name: keyof typeof SEARCH_ALIASES): string {
    return `${this.config.getOrThrow<string>('ELASTICSEARCH_INDEX_PREFIX')}_${SEARCH_ALIASES[name]}`;
  }

  async search<T>(alias: keyof typeof SEARCH_ALIASES, body: Record<string, unknown>) {
    return this.client.search<T>({
      index: this.alias(alias),
      ...body,
    });
  }

  async upsert(alias: keyof typeof SEARCH_ALIASES, id: string, document: Record<string, unknown>) {
    await this.client.index({
      index: this.alias(alias),
      id,
      document,
      refresh: false,
    });
  }

  async delete(alias: keyof typeof SEARCH_ALIASES, id: string) {
    await this.client.delete({ index: this.alias(alias), id, refresh: false }, { ignore: [404] });
  }

  async ensureCoreIndices(): Promise<void> {
    await this.ensureAlias('listings', {
      properties: {
        title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text' },
        status: { type: 'keyword' },
        cityId: { type: 'keyword' },
        citySlug: { type: 'keyword' },
        cityName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        areaId: { type: 'keyword' },
        areaSlug: { type: 'keyword' },
        areaName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        purposeId: { type: 'keyword' },
        purposeCode: { type: 'keyword' },
        propertyTypeId: { type: 'keyword' },
        propertyTypeCode: { type: 'keyword' },
        verificationStatus: { type: 'keyword' },
        priceAmount: { type: 'double' },
        areaValue: { type: 'double' },
        bedrooms: { type: 'integer' },
        bathrooms: { type: 'integer' },
        geoLocation: { type: 'geo_point' },
        publishedAt: { type: 'date' },
      },
    });
    await this.ensureAlias('projects', {
      properties: {
        name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text' },
        status: { type: 'keyword' },
        cityId: { type: 'keyword' },
        citySlug: { type: 'keyword' },
        cityName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        areaId: { type: 'keyword' },
        areaSlug: { type: 'keyword' },
        areaName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        projectTypeId: { type: 'keyword' },
        projectTypeCode: { type: 'keyword' },
        possessionStatus: { type: 'keyword' },
        legalStatus: { type: 'keyword' },
        minPriceAmount: { type: 'double' },
        geoLocation: { type: 'geo_point' },
        publishedAt: { type: 'date' },
      },
    });
    await this.ensureAlias('areas', {
      properties: {
        name: { type: 'text' },
        searchText: { type: 'search_as_you_type' },
        cityId: { type: 'keyword' },
        citySlug: { type: 'keyword' },
        slug: { type: 'keyword' },
      },
    });
  }

  private async ensureAlias(aliasName: keyof typeof SEARCH_ALIASES, mappings: Record<string, unknown>) {
    const alias = this.alias(aliasName);
    const index = this.physicalIndex(aliasName);
    const aliasExists = await this.client.indices.existsAlias({ name: alias });
    if (aliasExists) return;

    const indexExists = await this.client.indices.exists({ index });
    if (!indexExists) {
      await this.client.indices.create({ index, mappings });
    }
    await this.client.indices.putAlias({ index, name: alias, is_write_index: true });
  }

  physicalIndex(name: keyof typeof SEARCH_ALIASES): string {
    return `${this.config.getOrThrow<string>('ELASTICSEARCH_INDEX_PREFIX')}_${SEARCH_PHYSICAL_INDEX_BASE[name]}_v1`;
  }
}
