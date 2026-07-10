import { apiRequest, toQueryString } from './client';

export type AdminRecord = Record<string, unknown>;
export type AdminListResponse = AdminRecord[] | { items?: AdminRecord[]; data?: AdminRecord[]; results?: AdminRecord[] };

export type AdminOverview = {
  users?: number;
  listings?: number;
  projects?: number;
  openReports?: number;
  pendingVerificationRequests?: number;
  [key: string]: unknown;
};

export type ListingContactUpdateRow = {
  id: string;
  publicId: string;
  title: string;
  cityName: string | null;
  areaName: string | null;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  sourceUrl: string | null;
  updatedAt: string;
};

export type ListingContactUpdatesResponse = {
  items: ListingContactUpdateRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function normalizeList(response: AdminListResponse): AdminRecord[] {
  if (Array.isArray(response)) return response;
  return response.items ?? response.data ?? response.results ?? [];
}

export async function getAdminOverview() {
  return apiRequest<AdminOverview>('/admin/overview');
}

export async function getAdminSystemHealth() { return apiRequest<AdminRecord>('/health/system'); }
export async function listAdminSystemEvents() { return normalizeList(await apiRequest<AdminListResponse>('/admin/system-events')); }
export async function resolveAdminSystemEvent(id: string) { return apiRequest<AdminRecord>(`/admin/system-events/${id}/resolve`, { method: 'POST' }); }

export async function getAdminAnalyticsSummary(range = 'current_month') {
  return apiRequest<AdminRecord>(`/admin/analytics/summary${toQueryString({ range })}`);
}

export async function listAdminUsers() {
  return normalizeList(await apiRequest<AdminListResponse>('/admin/users'));
}

export async function createAdminUser(input: { fullName: string; email: string; phoneNumber: string; password: string }) {
  return apiRequest<AdminRecord>('/admin/users/create-admin', { method: 'POST', body: JSON.stringify(input) });
}

export async function setAdminUserStatus(id: string, action: 'approve' | 'block' | 'unblock') {
  return apiRequest<AdminRecord>(`/admin/users/${id}/${action}`, { method: 'POST' });
}

export async function addAdminUserRole(id: string, roleCode: string) {
  return apiRequest<AdminRecord>(`/admin/users/${id}/roles`, { method: 'POST', body: JSON.stringify({ roleCode }) });
}

export async function removeAdminUserRole(id: string, roleId: string) {
  return apiRequest<AdminRecord>(`/admin/users/${id}/roles/${roleId}`, { method: 'DELETE' });
}

export async function listAdminListings(status?: string) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/listings${toQueryString({ status })}`));
}

export async function listAdminListingContactUpdates(filters: { filter?: 'all' | 'missing'; page?: number; limit?: number; q?: string }) {
  return apiRequest<ListingContactUpdatesResponse>(`/admin/listing-contact-updates${toQueryString(filters)}`);
}

export async function updateAdminListingContact(id: string, input: { contactName?: string | null; contactPhone?: string | null; contactWhatsapp?: string | null }) {
  return apiRequest<ListingContactUpdateRow>(`/admin/listing-contact-updates/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listAdminProjects(status?: string) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/projects${toQueryString({ status })}`));
}

export async function reviewAdminListing(id: string, decision: 'approve' | 'reject', reason?: string) {
  return apiRequest<AdminRecord>(`/admin/listings/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function reviewAdminProject(id: string, decision: 'approve' | 'reject', reason?: string) {
  return apiRequest<AdminRecord>(`/admin/projects/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function listAdminReports(filters: { status?: string; entityType?: string; reasonCode?: string } = {}) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/reports${toQueryString(filters)}`));
}

export async function reviewAdminReport(id: string, decision: 'resolve' | 'dismiss', reason?: string) {
  return apiRequest<AdminRecord>(`/admin/reports/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function listAdminVerificationRequests() {
  return normalizeList(await apiRequest<AdminListResponse>('/admin/verification-requests'));
}

export async function reviewAdminVerification(id: string, decision: 'approve' | 'reject', reason?: string) {
  return apiRequest<AdminRecord>(`/admin/verification-requests/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function listAdminSubmissions(filters: { submissionType?: string; status?: string; q?: string } = {}) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/submissions${toQueryString(filters)}`));
}

export async function updateAdminSubmissionStatus(id: string, status: string, adminNotes?: string) {
  return apiRequest<AdminRecord>(`/admin/submissions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, adminNotes }) });
}

export async function assignAdminSubmission(id: string, assignedToUserId: string, adminNotes?: string) {
  return apiRequest<AdminRecord>(`/admin/submissions/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assignedToUserId, adminNotes }) });
}

export async function listAdminPromotions(status?: string) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/promotions${toQueryString({ status })}`));
}

export async function listAdminSubscriptions(status?: string) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/subscriptions${toQueryString({ status })}`));
}

export async function listAdminPayments() {
  return normalizeList(await apiRequest<AdminListResponse>('/admin/payments'));
}

export async function reconcileAdminPayment(id: string) {
  return apiRequest<AdminRecord>(`/admin/payments/${id}/reconcile`, { method: 'POST' });
}

export async function listAdminAuditLogs() {
  return normalizeList(await apiRequest<AdminListResponse>('/admin/audit-logs'));
}

export async function listAdminRiskFlags(filters: { status?: string; entityType?: string } = {}) {
  return normalizeList(await apiRequest<AdminListResponse>(`/admin/risk-flags${toQueryString(filters)}`));
}

export async function listAdminCmsPages() {
  return normalizeList(await apiRequest<AdminListResponse>('/admin/cms/pages'));
}

export async function listAdminBlogPosts() {
  return normalizeList(await apiRequest<AdminListResponse>('/admin/cms/blog-posts'));
}

export async function getAdminDataIntegrity() {
  return apiRequest<AdminRecord>('/admin/data-integrity/check');
}

export async function repairAdminDataIntegrity() {
  return apiRequest<AdminRecord>('/admin/data-integrity/repair', { method: 'POST' });
}

export async function getAdminSearchStatus() {
  return apiRequest<AdminRecord>('/admin/search/status');
}

export async function bootstrapAdminSearch() {
  return apiRequest<AdminRecord>('/admin/search/bootstrap', { method: 'POST' });
}

export async function runAdminSearchAction(action: 'listings' | 'projects' | 'areas') {
  return apiRequest<AdminRecord>(`/admin/search/reindex/${action}`, { method: 'POST' });
}
