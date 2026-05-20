import { apiRequest, toQueryString } from './client';
import { readWithFallback } from './mock-fallback';
import { listingResponse, mockAreas, mockListings, mockProjects, projectResponse } from '@/lib/mock-data';
import type { Amenity, AreaSuggestion, Listing, Project, SearchResponse } from '@/types/marketplace';

export type ListingSearchParams = {
  purpose?: 'buy' | 'rent';
  purposeCode?: string;
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
    apiRequest<SearchResponse<Project>>(`/search/projects${toQueryString({ ...params, limit: params.limit ?? 12 })}`),
    projectResponse(),
    'project search',
  );
}

export function getListing(publicId: string) {
  return readWithFallback(apiRequest<Listing>(`/listings/${publicId}`).then(normalizeListing), normalizeListing(mockListings.find((item) => item.publicId === publicId) ?? mockListings[0]), 'listing detail');
}

export function getProject(slug: string) {
  return readWithFallback(apiRequest<Project>(`/projects/${slug}`), mockProjects.find((item) => item.slug === slug) ?? mockProjects[0], 'project detail');
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
  return apiRequest<Project[]>(`/search/projects/${id}/similar`);
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

function normalizeListing(input: any): Listing {
  const city = input.city;
  const area = input.area;
  const propertyType = input.propertyType;
  const purpose = input.purpose;
  const media = Array.isArray(input.media) ? input.media : [];
  return {
    ...input,
    priceAmount: input.priceAmount !== undefined && input.priceAmount !== null ? Number(input.priceAmount) : undefined,
    cityId: input.cityId ?? city?.id,
    cityName: input.cityName ?? city?.name ?? '',
    areaId: input.areaId ?? area?.id,
    areaName: input.areaName ?? area?.name ?? '',
    propertyTypeId: input.propertyTypeId ?? propertyType?.id,
    propertyTypeName: input.propertyTypeName ?? propertyType?.name,
    purposeId: input.purposeId ?? purpose?.id,
    purposeName: input.purposeName ?? purpose?.name,
    areaValue: input.areaValue !== undefined && input.areaValue !== null ? Number(input.areaValue) : undefined,
    coverImageUrl: input.coverImageUrl ?? media.find((item: { isCover?: boolean }) => item.isCover)?.url ?? media[0]?.url,
    amenities: normalizeAmenities(input.amenities),
  };
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

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
