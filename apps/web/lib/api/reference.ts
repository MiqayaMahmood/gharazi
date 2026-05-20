import { apiRequest, toQueryString } from './client';
import { readWithFallback } from './mock-fallback';
import { mockAmenities, mockAreaReferences, mockCities, mockPropertyTypes, mockPurposes } from '@/lib/mock-data';
import type { ReferenceItem } from '@/types/reference';

export function listPurposes() {
  return readWithFallback(apiRequest<ReferenceItem[]>('/taxonomy/purposes'), mockPurposes, 'listing purposes');
}

export function listPropertyTypes() {
  return readWithFallback(apiRequest<ReferenceItem[]>('/taxonomy/property-types'), mockPropertyTypes, 'property types');
}

export function listAmenities() {
  return readWithFallback(apiRequest<ReferenceItem[]>('/taxonomy/amenities'), mockAmenities, 'amenities');
}

export function listCities() {
  return readWithFallback(apiRequest<ReferenceItem[]>('/locations/cities'), mockCities, 'cities');
}

export function listAreas(cityId?: string) {
  return readWithFallback(apiRequest<ReferenceItem[]>(`/locations/areas${toQueryString({ cityId })}`), mockAreaReferences.filter((area) => !cityId || area.cityId === cityId), 'areas');
}
