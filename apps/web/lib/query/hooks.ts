import { useQuery } from '@tanstack/react-query';
import { autocompleteAreas, batchListings, batchProjects, searchListings, searchProjects, type ListingSearchParams, type ProjectSearchParams } from '@/lib/api/marketplace';
import { getCurrentUser } from '@/lib/api/auth';
import { getListingOwnerSummary, getListingViewerContext, getMyListing, getProjectOwnerSummary, getProjectViewerContext } from '@/lib/api/supply';
import { getPopularListings, getPopularProjects } from '@/lib/api/analytics';
import { getChatMessages, getListingContact, listChats, listFavorites, listInquiries, listMyListings, listMyProjects, listNotifications, listSavedSearches } from '@/lib/api/engagement';
import { listAmenities, listAreas, listCities, listPropertyTypes, listPurposes } from '@/lib/api/reference';
import {
  getAdminAnalyticsSummary,
  getAdminDataIntegrity,
  getAdminOverview,
  getAdminSearchStatus,
  getAdminSystemHealth,
  listAdminAuditLogs,
  listAdminBlogPosts,
  listAdminCmsPages,
  listAdminListings,
  listAdminPayments,
  listAdminProjects,
  listAdminPromotions,
  listAdminReports,
  listAdminRiskFlags,
  listAdminSubmissions,
  listAdminSubscriptions,
  listAdminUsers,
  listAdminVerificationRequests,
  listAdminSystemEvents,
} from '@/lib/api/admin';

export function useListings(params: ListingSearchParams) {
  return useQuery({ queryKey: ['listings', params], queryFn: () => searchListings(params) });
}

export function useProjects(params: ProjectSearchParams) {
  return useQuery({ queryKey: ['projects', params], queryFn: () => searchProjects(params) });
}

export function useBatchListings(ids: string[]) {
  return useQuery({ queryKey: ['batch-listings', ids], queryFn: () => batchListings(ids), enabled: ids.length > 0, retry: false });
}

export function useBatchProjects(ids: string[]) {
  return useQuery({ queryKey: ['batch-projects', ids], queryFn: () => batchProjects(ids), enabled: ids.length > 0, retry: false });
}

export function useAreaAutocomplete(q: string) {
  return useQuery({
    queryKey: ['area-autocomplete', q],
    queryFn: () => autocompleteAreas(q),
    enabled: q.length > 1,
  });
}

export function useCurrentUser() {
  return useQuery({ queryKey: ['current-user'], queryFn: getCurrentUser, retry: false });
}

function useAuthenticatedQueryEnabled(enabled = true) {
  const currentUser = useCurrentUser();
  return enabled && Boolean(currentUser.data);
}

export function useFavorites(enabled = true) {
  return useQuery({ queryKey: ['favorites'], queryFn: () => listFavorites(), enabled: useAuthenticatedQueryEnabled(enabled) });
}

export function usePopularListings(params: { purpose?: string; limit?: number } = {}) {
  return useQuery({ queryKey: ['popular-listings', params], queryFn: () => getPopularListings(params), retry: false });
}

export function usePopularProjects(params: { limit?: number } = {}) {
  return useQuery({ queryKey: ['popular-projects', params], queryFn: () => getPopularProjects(params), retry: false });
}

export function useSavedSearches(enabled = true) {
  return useQuery({ queryKey: ['saved-searches'], queryFn: listSavedSearches, enabled: useAuthenticatedQueryEnabled(enabled) });
}

export function useInquiries(enabled = true) {
  return useQuery({ queryKey: ['inquiries'], queryFn: listInquiries, enabled: useAuthenticatedQueryEnabled(enabled) });
}

export function useListingContact(listingId?: string, enabled = true) {
  return useQuery({
    queryKey: ['listing-contact', listingId],
    queryFn: () => getListingContact(listingId as string),
    enabled: useAuthenticatedQueryEnabled(enabled && Boolean(listingId)),
    retry: false,
  });
}

export function useChats(enabled = true) {
  return useQuery({ queryKey: ['chats'], queryFn: listChats, enabled: useAuthenticatedQueryEnabled(enabled), refetchInterval: 30_000 });
}

export function useChatMessages(chatId?: string, enabled = true) {
  return useQuery({ queryKey: ['chat-messages', chatId], queryFn: () => getChatMessages(chatId as string), enabled: useAuthenticatedQueryEnabled(enabled && Boolean(chatId)), refetchInterval: 15_000 });
}

export function useNotifications(enabled = true) {
  return useQuery({ queryKey: ['notifications'], queryFn: listNotifications, enabled: useAuthenticatedQueryEnabled(enabled), refetchInterval: 30_000 });
}

export function useMyListings(enabled = true) {
  return useQuery({ queryKey: ['my-listings'], queryFn: listMyListings, enabled: useAuthenticatedQueryEnabled(enabled) });
}

export function useMyListing(id?: string, enabled = true) {
  return useQuery({
    queryKey: ['my-listing', id],
    queryFn: () => getMyListing(id as string),
    enabled: useAuthenticatedQueryEnabled(enabled && Boolean(id)),
    retry: false,
  });
}

export function useListingViewerContext(id?: string, enabled = true) {
  return useQuery({
    queryKey: ['listing-viewer-context', id],
    queryFn: () => getListingViewerContext(id as string),
    enabled: useAuthenticatedQueryEnabled(enabled && Boolean(id)),
    retry: false,
  });
}

export function useListingOwnerSummary(id?: string, enabled = true) {
  return useQuery({
    queryKey: ['listing-owner-summary', id],
    queryFn: () => getListingOwnerSummary(id as string),
    enabled: useAuthenticatedQueryEnabled(enabled && Boolean(id)),
    retry: false,
  });
}

export function useMyProjects(enabled = true) {
  return useQuery({ queryKey: ['my-projects'], queryFn: listMyProjects, enabled: useAuthenticatedQueryEnabled(enabled) });
}

export function useProjectViewerContext(id?: string, enabled = true) {
  return useQuery({
    queryKey: ['project-viewer-context', id],
    queryFn: () => getProjectViewerContext(id as string),
    enabled: useAuthenticatedQueryEnabled(enabled && Boolean(id)),
    retry: false,
  });
}

export function useProjectOwnerSummary(id?: string, enabled = true) {
  return useQuery({
    queryKey: ['project-owner-summary', id],
    queryFn: () => getProjectOwnerSummary(id as string),
    enabled: useAuthenticatedQueryEnabled(enabled && Boolean(id)),
    retry: false,
  });
}

export function usePurposes() {
  return useQuery({ queryKey: ['purposes'], queryFn: listPurposes });
}

export function usePropertyTypes() {
  return useQuery({ queryKey: ['property-types'], queryFn: listPropertyTypes });
}

export function useAmenities() {
  return useQuery({ queryKey: ['amenities'], queryFn: listAmenities });
}

export function useCities() {
  return useQuery({ queryKey: ['cities'], queryFn: listCities });
}

export function useAreas(cityId?: string) {
  return useQuery({ queryKey: ['areas', cityId], queryFn: () => listAreas(cityId), enabled: Boolean(cityId) });
}

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin-overview'], queryFn: getAdminOverview, retry: false });
}

export function useAdminSystemHealth() { return useQuery({ queryKey: ['admin-system-health'], queryFn: getAdminSystemHealth, retry: false, refetchInterval: 30000 }); }
export function useAdminSystemEvents() { return useQuery({ queryKey: ['admin-system-events'], queryFn: listAdminSystemEvents, retry: false }); }

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: listAdminUsers, retry: false });
}

export function useAdminListings(status?: string) {
  return useQuery({ queryKey: ['admin-listings', status], queryFn: () => listAdminListings(status), retry: false });
}

export function useAdminProjects(status?: string) {
  return useQuery({ queryKey: ['admin-projects', status], queryFn: () => listAdminProjects(status), retry: false });
}

export function useAdminReports() {
  return useQuery({ queryKey: ['admin-reports'], queryFn: () => listAdminReports(), retry: false });
}

export function useAdminVerificationRequests() {
  return useQuery({ queryKey: ['admin-verification-requests'], queryFn: listAdminVerificationRequests, retry: false });
}

export function useAdminSubmissions() {
  return useQuery({ queryKey: ['admin-submissions'], queryFn: () => listAdminSubmissions(), retry: false });
}

export function useAdminPromotions() {
  return useQuery({ queryKey: ['admin-promotions'], queryFn: () => listAdminPromotions(), retry: false });
}

export function useAdminSubscriptions() {
  return useQuery({ queryKey: ['admin-subscriptions'], queryFn: () => listAdminSubscriptions(), retry: false });
}

export function useAdminPayments() {
  return useQuery({ queryKey: ['admin-payments'], queryFn: listAdminPayments, retry: false });
}

export function useAdminAnalyticsSummary(range = 'current_month') {
  return useQuery({ queryKey: ['admin-analytics-summary', range], queryFn: () => getAdminAnalyticsSummary(range), retry: false });
}

export function useAdminAuditLogs() {
  return useQuery({ queryKey: ['admin-audit-logs'], queryFn: listAdminAuditLogs, retry: false });
}

export function useAdminCmsPages() {
  return useQuery({ queryKey: ['admin-cms-pages'], queryFn: listAdminCmsPages, retry: false });
}

export function useAdminBlogPosts() {
  return useQuery({ queryKey: ['admin-blog-posts'], queryFn: listAdminBlogPosts, retry: false });
}

export function useAdminRiskFlags() {
  return useQuery({ queryKey: ['admin-risk-flags'], queryFn: () => listAdminRiskFlags(), retry: false });
}

export function useAdminDataIntegrity() {
  return useQuery({ queryKey: ['admin-data-integrity'], queryFn: getAdminDataIntegrity, retry: false });
}

export function useAdminSearchStatus() {
  return useQuery({ queryKey: ['admin-search-status'], queryFn: getAdminSearchStatus, retry: false });
}
