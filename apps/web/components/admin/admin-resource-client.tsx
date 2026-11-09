'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ErrorAlert } from '../../components/ui/error-alert';
import {
  addAdminUserRole,
  assignAdminSubmission,
  bootstrapAdminSearch,
  createAdminUser,
  grantAdminPromotion,
  reconcileAdminPayment,
  repairAdminDataIntegrity,
  reviewAdminListing,
  reviewAdminProject,
  reviewAdminProfessional,
  reviewAdminReport,
  reviewAdminVerification,
  runAdminSearchAction,
  setAdminUserStatus,
  updateAdminSubmissionStatus,
  resolveAdminSystemEvent,
} from '../../lib/api/admin';
import {
  useAdminAuditLogs,
  useAdminBlogPosts,
  useAdminCmsPages,
  useAdminDataIntegrity,
  useAdminListings,
  useAdminPayments,
  useAdminPaymentReconciliationRequired,
  useAdminProjects,
  useAdminProfessionals,
  useAdminPromotions,
  useAdminReports,
  useAdminRiskFlags,
  useAdminSearchStatus,
  useAdminSubmissions,
  useAdminSubscriptions,
  useAdminSystemEvents,
  useAdminUsers,
  useAdminVerificationRequests,
  useCurrentUser,
} from '@/lib/query/hooks';
import { isAdmin } from '@/lib/auth/roles';
import type { AdminPromotionGrantInput } from '@/lib/api/admin';
import { AdminError, AdminLoading, AdminPageHeader, AdminTable, StatusBadge, formatDate, readPath } from './admin-primitives';

type Resource =
  | 'users'
  | 'listings'
  | 'projects'
  | 'professionals'
  | 'reports'
  | 'verification'
  | 'submissions'
  | 'promotions'
  | 'subscriptions'
  | 'payments'
  | 'analytics'
  | 'audit'
  | 'cms-pages'
  | 'blog-posts'
  | 'risk'
  | 'data-integrity'
  | 'search-ops'
  | 'system-events';

type QueryResult = { data?: Record<string, unknown>[]; isLoading: boolean; isError: boolean };

const titles: Record<Resource, [string, string]> = {
  users: ['Users', 'Approve, block, role-manage, and create admin users.'],
  listings: ['Listings Review', 'Review listing quality, verification status, and pending inventory.'],
  projects: ['Projects Review', 'Review developer projects and transparency signals.'],
  professionals: ['Professionals', 'Review business profiles, verification, inventory, and package status.'],
  reports: ['Reports', 'Resolve and dismiss marketplace reports.'],
  verification: ['Verification Requests', 'Approve or reject trust and identity requests.'],
  submissions: ['Submissions', 'Handle feedback, contact, and support requests.'],
  promotions: ['Promotions', 'Monitor paid placement lifecycle and campaign state.'],
  subscriptions: ['Subscriptions', 'Monitor user subscription status and plan activity.'],
  payments: ['Payments', 'Review transactions and reconcile payment records.'],
  analytics: ['Analytics', 'Operational analytics summary from existing rollups.'],
  audit: ['Audit Logs', 'Newest admin and system audit activity.'],
  'cms-pages': ['CMS Pages', 'Review public page content state.'],
  'blog-posts': ['Blog Posts', 'Review guide and content publication state.'],
  risk: ['Risk Flags', 'Review trust and safety flags.'],
  'data-integrity': ['Data Integrity', 'Run checks and repair indexing/status inconsistencies.'],
  'search-ops': ['Search Ops', 'Inspect search status and queue reindex jobs.'],
  'system-events': ['System Events', 'Review and resolve recent API, provider, and worker alerts.'],
};

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 160);
  return String(value);
}

function isVerifiedPaidStripePayment(row: Record<string, unknown>) {
  return row.status === 'paid' && row.provider === 'stripe' && Boolean(
    row.paidAt && (row.stripeCheckoutSessionId || row.stripePaymentIntentId),
  );
}

function safeAuditDetails(row: Record<string, unknown>) {
  const metadata = row.metadataJson && typeof row.metadataJson === 'object'
    ? row.metadataJson as Record<string, unknown>
    : {};
  const outcome = metadata.outcome;
  const reason = metadata.reason;
  const reasonCode = metadata.reasonCode;
  return [
    outcome ? `Outcome: ${text(outcome)}` : null,
    reasonCode ? `Reason code: ${text(reasonCode)}` : null,
    reason ? `Reason: ${text(reason)}` : null,
    metadata.promotionType ? `Promotion: ${text(metadata.promotionType)} (${text(metadata.durationDays)} days)` : null,
  ].filter(Boolean).join(' · ') || '-';
}

function useResource(resource: Resource, professionalStatus?: string): QueryResult {
  const users = useAdminUsers();
  const listings = useAdminListings();
  const projects = useAdminProjects();
  const professionals = useAdminProfessionals(professionalStatus);
  const reports = useAdminReports();
  const verification = useAdminVerificationRequests();
  const submissions = useAdminSubmissions();
  const promotions = useAdminPromotions();
  const subscriptions = useAdminSubscriptions();
  const payments = useAdminPayments();
  const audit = useAdminAuditLogs();
  const cmsPages = useAdminCmsPages();
  const blogPosts = useAdminBlogPosts();
  const risk = useAdminRiskFlags();
  const dataIntegrity = useAdminDataIntegrity();
  const searchStatus = useAdminSearchStatus();
  const systemEvents = useAdminSystemEvents();

  const map: Record<Resource, QueryResult> = {
    users,
    listings,
    projects,
    professionals,
    reports,
    verification,
    submissions,
    promotions,
    subscriptions,
    payments,
    analytics: { data: [], isLoading: false, isError: false },
    audit,
    'cms-pages': cmsPages,
    'blog-posts': blogPosts,
    risk,
    'data-integrity': { data: dataIntegrity.data ? [dataIntegrity.data] : [], isLoading: dataIntegrity.isLoading, isError: dataIntegrity.isError },
    'search-ops': { data: searchStatus.data ? [searchStatus.data] : [], isLoading: searchStatus.isLoading, isError: searchStatus.isError },
    'system-events': systemEvents,
  };
  return map[resource];
}

function columnsFor(resource: Resource) {
  const status = { key: 'status', label: 'Status', render: (row: Record<string, unknown>) => <StatusBadge value={row.status ?? row.verificationStatus} /> };
  const updated = { key: 'updatedAt', label: 'Updated', render: (row: Record<string, unknown>) => formatDate(row.updatedAt ?? row.createdAt) };
  if (resource === 'users') return [
    { key: 'profile.fullName', label: 'Name', render: (row: Record<string, unknown>) => text(readPath(row, 'profile.fullName') ?? row.email ?? row.phoneNumber) },
    { key: 'email', label: 'Email', render: (row: Record<string, unknown>) => text(row.email) },
    { key: 'roles', label: 'Roles', render: (row: Record<string, unknown>) => text(row.roles) },
    status,
    updated,
  ];
  if (resource === 'listings') return [
    { key: 'title', label: 'Title' },
    { key: 'ownerUser.profile.fullName', label: 'Owner', render: (row: Record<string, unknown>) => text(readPath(row, 'ownerUser.profile.fullName') ?? readPath(row, 'ownerUser.email')) },
    { key: 'city.name', label: 'City', render: (row: Record<string, unknown>) => text(readPath(row, 'city.name')) },
    { key: 'verificationStatus', label: 'Trust', render: (row: Record<string, unknown>) => <StatusBadge value={row.verificationStatus} /> },
    status,
  ];
  if (resource === 'projects') return [
    { key: 'name', label: 'Project' },
    { key: 'developer.name', label: 'Developer', render: (row: Record<string, unknown>) => text(readPath(row, 'developer.name')) },
    { key: 'city.name', label: 'City', render: (row: Record<string, unknown>) => text(readPath(row, 'city.name')) },
    { key: 'verificationStatus', label: 'Trust', render: (row: Record<string, unknown>) => <StatusBadge value={row.verificationStatus} /> },
    status,
  ];
  if (resource === 'professionals') return [
    { key: 'businessName', label: 'Business' },
    { key: 'businessType', label: 'Type' },
    { key: 'user.profile.fullName', label: 'Contact', render: (row: Record<string, unknown>) => text(row.contactPersonName ?? readPath(row, 'user.profile.fullName')) },
    { key: 'city.name', label: 'City', render: (row: Record<string, unknown>) => text(readPath(row, 'city.name')) },
    { key: 'user._count.ownedListings', label: 'Listings', render: (row: Record<string, unknown>) => text(readPath(row, 'user._count.ownedListings')) },
    { key: 'user.ownedDevelopers._count.projects', label: 'Projects', render: (row: Record<string, unknown>) => text(readPath(row, 'user.ownedDevelopers._count.projects') ?? 0) },
    { key: 'user.subscriptions', label: 'Package', render: (row: Record<string, unknown>) => text(readPath(row, 'user.subscriptions.0.packageCode') ?? readPath(row, 'user.subscriptions.0.plan.name') ?? 'Free / Basic') },
    { key: 'verificationStatus', label: 'Verification', render: (row: Record<string, unknown>) => <StatusBadge value={row.verificationStatus} /> },
    updated,
  ];
  if (resource === 'submissions') return [
    { key: 'submissionType', label: 'Type', render: (row: Record<string, unknown>) => <StatusBadge value={row.submissionType} /> },
    { key: 'name', label: 'From', render: (row: Record<string, unknown>) => text(row.name ?? row.email ?? row.phone) },
    { key: 'message', label: 'Message' },
    status,
    { key: 'createdAt', label: 'Date', render: (row: Record<string, unknown>) => formatDate(row.createdAt) },
  ];
  if (resource === 'reports') return [
    { key: 'reasonCode', label: 'Reason' },
    { key: 'entityType', label: 'Entity' },
    { key: 'description', label: 'Description' },
    status,
    { key: 'createdAt', label: 'Date', render: (row: Record<string, unknown>) => formatDate(row.createdAt) },
  ];
  if (resource === 'verification') return [
    { key: 'requestType', label: 'Type' },
    { key: 'userId', label: 'User' },
    { key: 'submittedDataJson', label: 'Submitted data', render: (row: Record<string, unknown>) => text(row.submittedDataJson) },
    status,
    { key: 'createdAt', label: 'Date', render: (row: Record<string, unknown>) => formatDate(row.createdAt) },
  ];
  if (resource === 'payments') return [
    { key: 'packageCode', label: 'Package' },
    { key: 'user.profile.fullName', label: 'User', render: (row: Record<string, unknown>) => text(readPath(row, 'user.profile.fullName') ?? readPath(row, 'user.email') ?? row.userId) },
    { key: 'entityType', label: 'Entity', render: (row: Record<string, unknown>) => `${text(row.entityType)} ${text(row.entityId).slice(0, 8)}` },
    { key: 'amount', label: 'Amount', render: (row: Record<string, unknown>) => `${text(row.currency)} ${text(row.amount)}` },
    status,
    { key: 'stripeCheckoutSessionId', label: 'Stripe reference', render: (row: Record<string, unknown>) => text(row.stripePaymentIntentId ?? row.stripeSubscriptionId ?? row.stripeCheckoutSessionId) },
    { key: 'paidAt', label: 'Paid / created', render: (row: Record<string, unknown>) => formatDate(row.paidAt ?? row.createdAt) },
  ];
  if (resource === 'audit') return [
    { key: 'action', label: 'Action' },
    { key: 'actorUser.profile.fullName', label: 'Administrator', render: (row: Record<string, unknown>) => text(readPath(row, 'actorUser.profile.fullName') ?? row.actorUserId) },
    { key: 'entityType', label: 'Target type' },
    { key: 'entityId', label: 'Target ID', render: (row: Record<string, unknown>) => text(row.entityId) },
    { key: 'metadataJson', label: 'Outcome / details', render: safeAuditDetails },
    { key: 'createdAt', label: 'Timestamp', render: (row: Record<string, unknown>) => formatDate(row.createdAt) },
  ];
  if (resource === 'promotions') return [
    { key: 'packageCode', label: 'Package', render: (row: Record<string, unknown>) => text(row.packageCode ?? row.promotionType) },
    { key: 'entityType', label: 'Entity', render: (row: Record<string, unknown>) => `${text(row.entityType)} ${text(row.entityId).slice(0, 8)}` },
    status,
    { key: 'startsAt', label: 'Starts', render: (row: Record<string, unknown>) => formatDate(row.startsAt) },
    { key: 'endsAt', label: 'Ends', render: (row: Record<string, unknown>) => formatDate(row.endsAt) },
  ];
  if (resource === 'subscriptions') return [
    { key: 'packageCode', label: 'Package', render: (row: Record<string, unknown>) => text(row.packageCode ?? readPath(row, 'plan.code')) },
    { key: 'user.profile.fullName', label: 'User', render: (row: Record<string, unknown>) => text(readPath(row, 'user.profile.fullName') ?? readPath(row, 'user.email') ?? row.userId) },
    status,
    { key: 'stripeSubscriptionId', label: 'Stripe subscription' },
    { key: 'currentPeriodEnd', label: 'Period end', render: (row: Record<string, unknown>) => formatDate(row.currentPeriodEnd ?? row.endAt) },
  ];
  if (resource === 'system-events') return [
    { key: 'severity', label: 'Severity', render: (row: Record<string, unknown>) => <StatusBadge value={row.severity} /> },
    { key: 'source', label: 'Source' },
    { key: 'message', label: 'Message' },
    { key: 'requestId', label: 'Request ID' },
    status,
    { key: 'createdAt', label: 'Created', render: (row: Record<string, unknown>) => formatDate(row.createdAt) },
  ];
  return [
    { key: 'id', label: 'ID', render: (row: Record<string, unknown>) => text(row.id).slice(0, 16) },
    { key: 'name', label: 'Name / Title', render: (row: Record<string, unknown>) => text(row.name ?? row.title ?? row.promotionType ?? row.action ?? row.entityType ?? row.planId) },
    status,
    updated,
  ];
}

function useActions(resource: Resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ row, action }: { row: Record<string, unknown>; action: string }) => {
      const id = String(row.id);
      if (resource === 'users') return action === 'block' ? setAdminUserStatus(id, 'block') : action === 'role-admin' ? addAdminUserRole(id, 'admin') : setAdminUserStatus(id, 'approve');
      if (resource === 'listings') return reviewAdminListing(id, action === 'reject' ? 'reject' : 'approve', action === 'reject' ? 'Rejected from admin dashboard' : undefined);
      if (resource === 'projects') return reviewAdminProject(id, action === 'reject' ? 'reject' : 'approve', action === 'reject' ? 'Rejected from admin dashboard' : undefined);
      if (resource === 'professionals') return reviewAdminProfessional(id, action.startsWith('reject:') ? 'reject' : 'approve', action.startsWith('reject:') ? action.slice(7) : undefined);
      if (resource === 'reports') return reviewAdminReport(id, action === 'dismiss' ? 'dismiss' : 'resolve', action);
      if (resource === 'verification') return reviewAdminVerification(id, action === 'reject' ? 'reject' : 'approve', action === 'reject' ? 'Rejected from admin dashboard' : undefined);
      if (resource === 'submissions') return action === 'assign' ? assignAdminSubmission(id, '', 'Assignment pending') : updateAdminSubmissionStatus(id, action);
      if (resource === 'payments') return reconcileAdminPayment(id);
      if (resource === 'system-events') return resolveAdminSystemEvent(id);
      if (resource === 'data-integrity') return repairAdminDataIntegrity();
      if (resource === 'search-ops') return action === 'bootstrap' ? bootstrapAdminSearch() : runAdminSearchAction(action as 'listings' | 'projects' | 'areas');
      return Promise.resolve(row);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') console.error('Admin action failed', error);
    },
  });
}

export function AdminResourceClient({ resource }: { resource: Resource }) {
  const [professionalStatus, setProfessionalStatus] = useState('');
  const query = useResource(resource, professionalStatus);
  const mutation = useActions(resource);
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const canGrantPromotions = isAdmin(currentUser);
  const listingSuggestions = useAdminListings('active', resource === 'promotions' && canGrantPromotions);
  const [reconciliationView, setReconciliationView] = useState(false);
  const [reconciliationCursor, setReconciliationCursor] = useState<string | undefined>();
  const [reconciliationPrevious, setReconciliationPrevious] = useState<Array<string | undefined>>([]);
  const reconciliationPage = useAdminPaymentReconciliationRequired(reconciliationCursor, resource === 'payments' && reconciliationView);
  const [listingId, setListingId] = useState('');
  const [promotionType, setPromotionType] = useState<AdminPromotionGrantInput['promotionType']>('listing_hot');
  const [grantReason, setGrantReason] = useState('');
  const [grantAttempt, setGrantAttempt] = useState<{ fingerprint: string; input: AdminPromotionGrantInput } | null>(null);
  const [grantMessage, setGrantMessage] = useState('');
  const [reconciliationMessage, setReconciliationMessage] = useState('');
  const grantMutation = useMutation({
    mutationFn: grantAdminPromotion,
    onSuccess: async (result) => {
      const replayed = result.replayed === true;
      setGrantMessage(replayed ? 'This request was already completed. The existing grant was returned.' : 'Promotion grant created and recorded in the audit log.');
      setGrantAttempt(null);
      setListingId('');
      setGrantReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
  });
  const reconciliationMutation = useMutation({
    mutationFn: reconcileAdminPayment,
    onSuccess: async (result) => {
      setReconciliationMessage(`Payment ${String(result.outcome ?? 'reconciliation completed')}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-payment-reconciliation-required'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
  });
  const submitGrant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = grantReason.trim();
    if (reason.length < 10) return;
    const durationDays: AdminPromotionGrantInput['durationDays'] = promotionType === 'listing_hot' ? 14 : 30;
    const fingerprint = JSON.stringify({ listingId: listingId.trim(), promotionType, durationDays, reason });
    if (!window.confirm(`Grant ${promotionType === 'listing_hot' ? 'Hot Listing (14 days)' : 'Super Hot Listing (30 days)'} to listing ${listingId.trim()}? This creates an active administrative promotion and an audit record.`)) return;
    const input = grantAttempt?.fingerprint === fingerprint
      ? grantAttempt.input
      : { idempotencyKey: crypto.randomUUID(), listingId: listingId.trim(), promotionType, durationDays, reason };
    setGrantAttempt({ fingerprint, input });
    setGrantMessage('');
    grantMutation.mutate(input);
  };
  const retryGrant = () => {
    if (!grantAttempt || !window.confirm('Retry the same grant request using its original idempotency key?')) return;
    grantMutation.mutate(grantAttempt.input);
  };
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', phoneNumber: '', password: '' });
  const createAdmin = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => setAdminForm({ fullName: '', email: '', phoneNumber: '', password: '' }),
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') console.error('Create admin failed', error);
    },
  });
  const [title, description] = titles[resource];
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const suggestedListings = (listingSuggestions.data ?? []).filter((row) => row.status === 'active' && Boolean(row.publishedAt) && !row.deletedAt);
  const displayedRows = resource === 'payments' && reconciliationView
    ? reconciliationPage.data?.items ?? []
    : rows;

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message="The backend endpoint for this admin view may be unavailable or your role may not have access." />;

  if (resource === 'analytics') {
    return (
      <>
        <AdminPageHeader title={title} description={description} />
        <Card className="p-6">
          <p className="text-sm text-muted">Analytics summary is available on the overview page. Deeper charts are deferred until richer rollup data is populated.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title={title} description={description} />
      {resource === 'promotions' && canGrantPromotions ? (
        <Card className="mb-5 p-4 sm:p-5">
          <h3 className="text-lg font-bold text-ink">Grant a promotion</h3>
          <p className="mt-1 text-sm text-muted">Administrative grants are free of Stripe payment evidence. The API verifies current listing eligibility and records the administrator and reason.</p>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitGrant}>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Listing ID
              <Input list="admin-grant-listings" value={listingId} onChange={(event) => { setListingId(event.target.value); setGrantMessage(''); }} placeholder="Paste or select a listing UUID" required />
              <span className="text-xs font-normal text-muted">Suggestions show up to 200 active published listings. The backend remains authoritative for eligibility.</span>
              <datalist id="admin-grant-listings">
                {suggestedListings.map((listing) => <option key={String(listing.id)} value={String(listing.id)}>{String(listing.title ?? 'Listing')} · {String(listing.publicId ?? '')}</option>)}
              </datalist>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Promotion package
              <select className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-sm" value={promotionType} onChange={(event) => setPromotionType(event.target.value as AdminPromotionGrantInput['promotionType'])}>
                <option value="listing_hot">Hot Listing · 14 days</option>
                <option value="listing_super_hot">Super Hot Listing · 30 days</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-ink md:col-span-2">
              Administrative reason
              <textarea className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm font-normal" value={grantReason} onChange={(event) => { setGrantReason(event.target.value); setGrantMessage(''); }} minLength={10} maxLength={1000} required aria-describedby="admin-grant-reason-help" />
              <span id="admin-grant-reason-help" className="text-xs font-normal text-muted">Required, 10–1000 characters. This reason is retained in the grant audit record.</span>
            </label>
            {grantMutation.isError ? <div className="md:col-span-2"><ErrorAlert error={grantMutation.error} /></div> : null}
            {grantMessage ? <p className="md:col-span-2 text-sm font-semibold text-trust" role="status">{grantMessage}</p> : null}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={grantMutation.isPending || grantReason.trim().length < 10 || !listingId.trim()}>
                {grantMutation.isPending ? 'Submitting…' : 'Review and grant'}
              </Button>
              {grantMutation.isError && grantAttempt ? <Button type="button" variant="secondary" disabled={grantMutation.isPending} onClick={retryGrant}>Retry same request</Button> : null}
            </div>
          </form>
        </Card>
      ) : null}
      {resource === 'payments' ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant={!reconciliationView ? 'primary' : 'secondary'} onClick={() => setReconciliationView(false)}>All payments</Button>
          <Button type="button" variant={reconciliationView ? 'primary' : 'secondary'} onClick={() => { setReconciliationView(true); setReconciliationCursor(undefined); setReconciliationPrevious([]); setReconciliationMessage(''); }}>Reconciliation required</Button>
          {reconciliationMessage ? <span className="text-sm font-semibold text-trust" role="status">{reconciliationMessage}</span> : null}
        </div>
      ) : null}
      {resource === 'payments' && reconciliationView ? (
        <>
          <Card className="mb-4 p-4 text-sm text-muted">This view paginates all paid transactions marked for fulfillment reconciliation. Only verified Stripe payments are actionable. Reconciliation never issues an automatic refund.</Card>
          {reconciliationPage.isLoading ? <AdminLoading /> : null}
          {reconciliationPage.isError ? <AdminError message="Unable to load reconciliation-required payments." /> : null}
          {reconciliationMutation.isError ? <div className="mb-4"><ErrorAlert error={reconciliationMutation.error} /></div> : null}
          {!reconciliationPage.isLoading && !reconciliationPage.isError ? (
            <>
              <AdminTable
                columns={[
                  { key: 'id', label: 'Payment ID' },
                  { key: 'entityType', label: 'Target', render: (row) => `${text(row.entityType)} · ${text(row.entityId)}` },
                  { key: 'packageCode', label: 'Package' },
                  { key: 'status', label: 'Payment status', render: (row) => <StatusBadge value={row.status} /> },
                  { key: 'amount', label: 'Paid amount', render: (row) => `${text(row.currency)} ${text(row.amount)}` },
                  { key: 'paidAt', label: 'Paid at', render: (row) => formatDate(row.paidAt) },
                  { key: 'reconciliationReasonCode', label: 'Failure / reason', render: (row) => text(row.reconciliationReasonCode) },
                  { key: 'stripePaymentVerified', label: 'Payment verification', render: (row) => row.stripePaymentVerified === true ? 'Verified Stripe payment' : 'Verification reference unavailable' },
                ]}
                rows={displayedRows}
                actions={(row) => row.status === 'paid' && row.reconciliationStatus === 'required' && row.stripePaymentVerified === true
                  ? <Button type="button" variant="secondary" disabled={reconciliationMutation.isPending} onClick={() => {
                    if (window.confirm(`Retry fulfillment for verified payment ${String(row.id)}? This does not charge or refund the customer.`)) reconciliationMutation.mutate(String(row.id));
                  }}>Reconcile</Button>
                  : <span className="text-xs text-muted">Not eligible for retry</span>}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" disabled={!reconciliationPrevious.length || reconciliationMutation.isPending} onClick={() => {
                  const previous = [...reconciliationPrevious];
                  const cursor = previous.pop();
                  setReconciliationPrevious(previous);
                  setReconciliationCursor(cursor);
                }}>Previous page</Button>
                <Button type="button" variant="secondary" disabled={!reconciliationPage.data?.hasNextPage || reconciliationMutation.isPending} onClick={() => {
                  const next = reconciliationPage.data?.nextCursor;
                  if (next) {
                    setReconciliationPrevious((previous) => [...previous, reconciliationCursor]);
                    setReconciliationCursor(next);
                  }
                }}>Next page</Button>
                <span className="text-sm text-muted">Page size {reconciliationPage.data?.limit ?? 100}; {reconciliationPage.data?.hasNextPage ? 'more results available' : 'end of matching results'}.</span>
              </div>
            </>
          ) : null}
        </>
      ) : null}
      {resource === 'users' ? (
        <Card className="mb-5 grid gap-3 p-4 lg:grid-cols-5">
          <Input placeholder="Full name" value={adminForm.fullName} onChange={(event) => setAdminForm({ ...adminForm, fullName: event.target.value })} />
          <Input placeholder="Email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} />
          <Input placeholder="Phone" value={adminForm.phoneNumber} onChange={(event) => setAdminForm({ ...adminForm, phoneNumber: event.target.value })} />
          <Input placeholder="Password" type="password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} />
          <Button onClick={() => createAdmin.mutate(adminForm)} disabled={createAdmin.isPending}>Create admin</Button>
        </Card>
      ) : null}
      {resource === 'professionals' ? <div className="mb-4"><select className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold" value={professionalStatus} onChange={(event) => setProfessionalStatus(event.target.value)}><option value="">All verification states</option><option value="unverified">Unverified</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></div> : null}
      {createAdmin.isError ? <div className="mb-4"><ErrorAlert error={createAdmin.error} /></div> : null}
      {mutation.isError ? <div className="mb-4"><ErrorAlert error={mutation.error} /></div> : null}
      {resource === 'data-integrity' ? (
        <Button className="mb-4" onClick={() => mutation.mutate({ row: rows[0] ?? {}, action: 'repair' })}>Run repair</Button>
      ) : null}
      {resource === 'search-ops' ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => mutation.mutate({ row: rows[0] ?? {}, action: 'bootstrap' })}>Bootstrap search</Button>
          {(['listings', 'projects', 'areas'] as const).map((action) => <Button key={action} variant="secondary" onClick={() => mutation.mutate({ row: rows[0] ?? {}, action })}>Reindex {action}</Button>)}
        </div>
      ) : null}
      {!(resource === 'payments' && reconciliationView) ? <AdminTable
        columns={columnsFor(resource)}
        rows={rows}
        actions={(row) => {
          if (resource === 'users') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'approve' })}>Approve</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'block' })}>Block</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'role-admin' })}>Admin role</Button></div>;
          if (resource === 'professionals') return <div className="flex gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'approve' })}>Approve</Button><Button variant="ghost" onClick={() => { const reason = window.prompt('Rejection reason'); if (reason?.trim()) mutation.mutate({ row, action: `reject:${reason.trim()}` }); }}>Reject</Button></div>;
          if (resource === 'listings' || resource === 'projects' || resource === 'verification') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'approve' })}>Approve</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'reject' })}>Reject</Button></div>;
          if (resource === 'reports') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'resolve' })}>Resolve</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'dismiss' })}>Dismiss</Button></div>;
          if (resource === 'submissions') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'in_progress' })}>In progress</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'resolved' })}>Resolve</Button></div>;
          if (resource === 'payments' && isVerifiedPaidStripePayment(row)) return <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => {
            if (window.confirm(`Attempt fulfillment reconciliation for verified paid Stripe transaction ${String(row.id)}? This does not charge or refund the customer.`)) mutation.mutate({ row, action: 'reconcile' });
          }}>Reconcile</Button>;
          if (resource === 'system-events' && row.status === 'open') return <Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'resolve' })}>Resolve</Button>;
          return null;
        }}
      /> : null}
    </>
  );
}
