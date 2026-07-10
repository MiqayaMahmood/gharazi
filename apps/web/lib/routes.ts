import type { Listing, Project } from '@/types/marketplace';

type ListingRouteInput = Pick<Listing, 'publicId'>;
type ProjectRouteInput = Pick<Project, 'slug'>;

export function getListingHref(listing: ListingRouteInput) {
  return `/listing/${listing.publicId}`;
}

export function getProjectHref(project: ProjectRouteInput) {
  return `/project/${project.slug}`;
}

export function getCityBuyHref(citySlug: string) {
  return `/buy/${citySlug}`;
}

export function getCityRentHref(citySlug: string) {
  return `/rent/${citySlug}`;
}

export function getAreaHref(areaSlug: string) {
  return `/area/${areaSlug}`;
}

export function getBuyPropertyTypeCityHref(propertyTypeCode: string, citySlug: string) {
  return `/buy/${propertyTypeCode}/${citySlug}`;
}

export function getProjectsCityHref(citySlug: string) {
  return `/projects/${citySlug}`;
}

export function getDashboardListingEditHref(id: string) {
  return `/dashboard/listings/${id}/edit`;
}

export function getDashboardProjectEditHref(id: string) {
  return `/dashboard/projects/${id}/edit`;
}

export function getAdminListingHref(id: string) {
  return `/admin/listings?listingId=${encodeURIComponent(id)}`;
}
