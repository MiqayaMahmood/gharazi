import { apiRequest, toQueryString } from './client';
import { readWithFallback } from './mock-fallback';
import { listingResponse, mockAreas, mockListings, mockProjects, projectResponse } from '@/lib/mock-data';
import type { Amenity, AreaSuggestion, Listing, Project, SearchResponse } from '@/types/marketplace';

export type ListingSearchParams = {
  purpose?: 'buy' | 'rent';
  purposeSlug?: string;
  q?: string;
  cityId?: string;
  citySlug?: string;
  areaId?: string;
  areaSlug?: string;
  propertyTypeId?: string;
  propertyTypeCode?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishedStatus?: string;
  verifiedOnly?: boolean;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: string;
  page?: number;
  limit?: number;
};

export type ProjectSearchParams = {
  q?: string;
  cityId?: string;
  citySlug?: string;
  areaId?: string;
  areaSlug?: string;
  projectTypeId?: string;
  projectTypeCode?: string;
  propertyTypeCode?: string;
  possessionStatus?: string;
  legalStatus?: string;
  minPrice?: number;
  maxPrice?: number;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: string;
  page?: number;
  limit?: number;
};

export function searchListings(params: ListingSearchParams = {}) {
  return readWithFallback(
    apiRequest<SearchResponse<Listing>>(`/search/listings${toQueryString({ ...params, limit: params.limit ?? 12 })}`).then((response) => ({
      ...response,
      items: response.items.map(normalizeListing),
    })),
    { ...listingResponse(), items: listingResponse().items.map(normalizeListing) },
    'listing search',
  );
}

export function searchProjects(params: ProjectSearchParams = {}) {
  return readWithFallback(
    apiRequest<SearchResponse<Project>>(`/search/projects${toQueryString({ ...params, limit: params.limit ?? 12 })}`).then((response) => ({
      ...response,
      items: response.items.map(normalizeProject),
    })),
    { ...projectResponse(), items: projectResponse().items.map(normalizeProject) },
    'project search',
  );
}

export function getListing(publicId: string) {
  return readWithFallback(apiRequest<Listing>(`/listings/${publicId}`).then(normalizeListing), normalizeListing(mockListings.find((item) => item.publicId === publicId) ?? mockListings[0]), 'listing detail');
}

export function getProject(slug: string) {
  return readWithFallback(apiRequest<Project>(`/projects/${slug}`).then(normalizeProject), normalizeProject(mockProjects.find((item) => item.slug === slug) ?? mockProjects[0]), 'project detail');
}

export function batchListings(ids: string[]) {
  if (!ids.length) return Promise.resolve([]);
  return apiRequest<Listing[]>('/listings/batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }).then((items) => items.map(normalizeListing));
}

export function getSimilarListings(id: string) {
  return apiRequest<Listing[]>(`/search/listings/${id}/similar`).then((items) => items.map(normalizeListing));
}

export function getSimilarProjects(id: string) {
  return apiRequest<Project[]>(`/search/projects/${id}/similar`).then((items) => items.map(normalizeProject));
}

export function batchProjects(ids: string[]) {
  if (!ids.length) return Promise.resolve([]);
  return apiRequest<Project[]>('/projects/batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function autocompleteAreas(q: string) {
  const local = mockAreas.filter((area) => `${area.name} ${area.cityName}`.toLowerCase().includes(q.toLowerCase()));
  return readWithFallback(apiRequest<AreaSuggestion[]>(`/search/areas/autocomplete${toQueryString({ q })}`), q ? local : mockAreas, 'area autocomplete');
}

function normalizeListing(rawInput: any): Listing {
  const input = stripSourceFields(rawInput);
  const city = input.city;
  const area = input.area;
  const propertyType = input.propertyType;
  const purpose = input.purpose;
  const media = Array.isArray(input.media) ? input.media : [];
  const images = normalizeListingImages(media.length ? media : input.images, input.title) ?? [];
  return {
    ...input,
    priceAmount: input.priceAmount !== undefined && input.priceAmount !== null ? Number(input.priceAmount) : undefined,
    cityId: input.cityId ?? city?.id,
    cityName: input.cityName ?? city?.name ?? '',
    citySlug: input.citySlug ?? city?.slug,
    areaId: input.areaId ?? area?.id,
    areaName: input.areaName ?? area?.name ?? '',
    areaSlug: input.areaSlug ?? area?.slug,
    propertyTypeId: input.propertyTypeId ?? propertyType?.id,
    propertyTypeName: input.propertyTypeName ?? propertyType?.name,
    purposeId: input.purposeId ?? purpose?.id,
    purposeSlug: input.purposeSlug ?? purpose?.name,
    areaValue: input.areaValue !== undefined && input.areaValue !== null ? Number(input.areaValue) : undefined,
    images,
    media: images,
    coverImageUrl: input.coverImageUrl ?? images.find((item) => item.isCover)?.url ?? images[0]?.url,
    amenities: normalizeAmenities(input.amenities),
  };
}

function normalizeProject(rawInput: any): Project {
  const input = stripSourceFields(rawInput);
  const city = input.city;
  const area = input.area;
  const developer = input.developer;
  const projectType = input.projectType;
  const media = Array.isArray(input.media) ? input.media : [];
  return {
    ...input,
    developerName: input.developerName ?? developer?.companyName ?? '',
    cityName: input.cityName ?? city?.name ?? '',
    citySlug: input.citySlug ?? city?.slug,
    areaName: input.areaName ?? area?.name ?? '',
    areaSlug: input.areaSlug ?? area?.slug,
    projectTypeName: input.projectTypeName ?? projectType?.name,
    minPriceAmount: input.minPriceAmount !== undefined && input.minPriceAmount !== null ? Number(input.minPriceAmount) : undefined,
    maxPriceAmount: input.maxPriceAmount !== undefined && input.maxPriceAmount !== null ? Number(input.maxPriceAmount) : undefined,
    coverImageUrl: input.coverImageUrl ?? media.find((item: { isCover?: boolean }) => item.isCover)?.url ?? media[0]?.url,
    amenities: normalizeProjectAmenities(input.amenities),
    units: normalizeProjectUnits(input.units),
    updates: normalizeProjectUpdates(input.updates),
  };
}

function stripSourceFields(input: any) {
  if (!input || typeof input !== 'object') return input;
  const publicFields = { ...input };
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
  ].forEach((key) => delete publicFields[key]);
  return publicFields;
}

function normalizeAmenities(input: unknown): Amenity[] {
  if (!Array.isArray(input)) return [];
  return input.reduce<Amenity[]>((items, item) => {
      if (typeof item === 'string') {
        items.push({ name: item, slug: slugify(item), code: slugify(item) });
        return items;
      }
      if (!item || typeof item !== 'object') return items;
      const raw = item as { amenity?: Amenity; id?: string; code?: string; name?: string; slug?: string };
      const amenity = raw.amenity ?? raw;
      if (!amenity.name) return items;
      items.push({
        id: amenity.id,
        code: amenity.code,
        name: amenity.name,
        slug: amenity.slug,
      });
      return items;
    }, []);
}

function normalizeListingImages(input: unknown, title?: string): Listing['images'] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any, index) => ({
      id: item.id ?? `${item.url}-${index}`,
      url: item.url,
      alt: item.alt ?? title,
      sortOrder: item.sortOrder ?? index,
      isCover: Boolean(item.isCover),
      mediaType: item.mediaType,
      storageKey: item.storageKey,
    }))
    .filter((item) => Boolean(item.url))
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function normalizeProjectAmenities(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return undefined;
      const raw = item as { amenity?: { name?: string }; name?: string };
      return raw.amenity?.name ?? raw.name;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeProjectUnits(input: unknown): Project['units'] {
  if (!Array.isArray(input)) return undefined;
  return input.map((unit: any) => ({
    id: unit.id,
    type: unit.type ?? unit.propertyType?.name ?? 'Unit',
    size: unit.size ?? (unit.areaValue && unit.areaUnit ? `${Number(unit.areaValue)} ${unit.areaUnit}` : ''),
    price: unit.price ?? (unit.minPriceAmount ? Number(unit.minPriceAmount) : undefined),
  }));
}

function normalizeProjectUpdates(input: unknown): Project['updates'] {
  if (!Array.isArray(input)) return undefined;
  return input.map((update: any) => ({
    id: update.id,
    title: update.title,
    date: update.date ?? update.updateDate,
    summary: update.summary ?? update.body ?? '',
  }));
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
