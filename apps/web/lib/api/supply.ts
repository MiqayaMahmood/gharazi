import { apiRequest } from './client';
import type { Listing, OwnerSummary, Project, ViewerContext } from '@/types/marketplace';

export type ListingFormPayload = {
  purposeId: string;
  propertyTypeId: string;
  cityId: string;
  areaId: string;
  title: string;
  description: string;
  priceAmount: number;
  areaValue: number;
  areaUnit: string;
  bedrooms?: number;
  bathrooms?: number;
  floorNumber?: number;
  totalFloors?: number;
  furnishedStatus?: string;
  possessionStatus?: string;
  addressLine?: string;
  contactName?: string;
  contactPhone?: string;
  amenityIds?: string[];
};

export type ProjectFormPayload = {
  cityId: string;
  areaId: string;
  projectTypeId: string;
  name: string;
  shortDescription?: string;
  description: string;
  possessionStatus: string;
  legalStatus?: string;
  expectedHandoverDate?: string;
  launchDate?: string;
  addressLine?: string;
  brochureUrl?: string;
  paymentPlanSummary?: string;
  minPriceAmount?: number;
  maxPriceAmount?: number;
  amenityIds?: string[];
};

export type MediaPayload = {
  id?: string;
  mediaType: string;
  storageKey: string;
  url: string;
  isCover?: boolean;
  sortOrder?: number;
};

export type PresignUploadInput = {
  filename: string;
  contentType: string;
  entityType: 'listing' | 'project';
  entityId: string;
  mediaType: 'image' | 'video' | 'floorplan' | 'brochure';
};

export type ProjectUnitPayload = {
  propertyTypeId: string;
  title: string;
  areaValue?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  minPriceAmount?: number;
  maxPriceAmount?: number;
  possessionStatus?: string;
  inventoryStatus?: string;
};

export type ProjectUpdatePayload = {
  title: string;
  body: string;
  updateDate: string;
  progressPercent?: number;
  publish?: boolean;
};

export function createListing(payload: ListingFormPayload) {
  return apiRequest<Listing>('/listings', { method: 'POST', body: JSON.stringify(payload) });
}

export function getMyListing(id: string) {
  return apiRequest<Listing>(`/listings/me/${id}`);
}

export function updateListing(id: string, payload: Partial<ListingFormPayload>) {
  return apiRequest<Listing>(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function publishListing(id: string) {
  return apiRequest<Listing>(`/listings/${id}/publish`, { method: 'POST' });
}

export function archiveListing(id: string) {
  return apiRequest<Listing>(`/listings/${id}/archive`, { method: 'POST' });
}

export function refreshListing(id: string) {
  return apiRequest<Listing>(`/listings/${id}/refresh`, { method: 'POST' });
}

export function markListingSold(id: string) {
  return apiRequest<Listing>(`/listings/${id}/mark-sold`, { method: 'POST' });
}

export function markListingRented(id: string) {
  return apiRequest<Listing>(`/listings/${id}/mark-rented`, { method: 'POST' });
}

export function getListingViewerContext(id: string) {
  return apiRequest<ViewerContext>(`/listings/${id}/viewer-context`);
}

export function getListingOwnerSummary(id: string) {
  return apiRequest<OwnerSummary>(`/listings/${id}/owner-summary`);
}

export function addListingMedia(id: string, payload: MediaPayload) {
  return apiRequest(`/listings/${id}/media`, { method: 'POST', body: JSON.stringify(payload) });
}

export function createProject(payload: ProjectFormPayload) {
  return apiRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateProject(id: string, payload: Partial<ProjectFormPayload>) {
  return apiRequest<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function publishProject(id: string) {
  return apiRequest<Project>(`/projects/${id}/publish`, { method: 'POST' });
}

export function archiveProject(id: string) {
  return apiRequest<Project>(`/projects/${id}/archive`, { method: 'POST' });
}

export function getProjectViewerContext(id: string) {
  return apiRequest<ViewerContext>(`/projects/${id}/viewer-context`);
}

export function getProjectOwnerSummary(id: string) {
  return apiRequest<OwnerSummary>(`/projects/${id}/owner-summary`);
}

export function addProjectMedia(id: string, payload: MediaPayload) {
  return apiRequest(`/projects/${id}/media`, { method: 'POST', body: JSON.stringify(payload) });
}

export function presignUpload(payload: PresignUploadInput) {
  return apiRequest<{ uploadUrl: string; storageKey: string; url: string; method: 'PUT'; mode: string }>('/media/presign-upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addProjectUnit(id: string, payload: ProjectUnitPayload) {
  return apiRequest(`/projects/${id}/units`, { method: 'POST', body: JSON.stringify(payload) });
}

export function addProjectUpdate(id: string, payload: ProjectUpdatePayload) {
  return apiRequest(`/projects/${id}/updates`, { method: 'POST', body: JSON.stringify(payload) });
}
