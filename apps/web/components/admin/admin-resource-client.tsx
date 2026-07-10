'use client';

import { useMemo, useState } from 'react';
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
  reconcileAdminPayment,
  repairAdminDataIntegrity,
  reviewAdminListing,
  reviewAdminProject,
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
  useAdminProjects,
  useAdminPromotions,
  useAdminReports,
  useAdminRiskFlags,
  useAdminSearchStatus,
  useAdminSubmissions,
  useAdminSubscriptions,
  useAdminSystemEvents,
  useAdminUsers,
  useAdminVerificationRequests,
} from '@/lib/query/hooks';
import { AdminError, AdminLoading, AdminPageHeader, AdminTable, StatusBadge, formatDate, readPath } from './admin-primitives';

type Resource =
  | 'users'
  | 'listings'
  | 'projects'
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

function useResource(resource: Resource): QueryResult {
  const users = useAdminUsers();
  const listings = useAdminListings();
  const projects = useAdminProjects();
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
  const query = useResource(resource);
  const mutation = useActions(resource);
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
      {resource === 'users' ? (
        <Card className="mb-5 grid gap-3 p-4 lg:grid-cols-5">
          <Input placeholder="Full name" value={adminForm.fullName} onChange={(event) => setAdminForm({ ...adminForm, fullName: event.target.value })} />
          <Input placeholder="Email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} />
          <Input placeholder="Phone" value={adminForm.phoneNumber} onChange={(event) => setAdminForm({ ...adminForm, phoneNumber: event.target.value })} />
          <Input placeholder="Password" type="password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} />
          <Button onClick={() => createAdmin.mutate(adminForm)} disabled={createAdmin.isPending}>Create admin</Button>
        </Card>
      ) : null}
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
      <AdminTable
        columns={columnsFor(resource)}
        rows={rows}
        actions={(row) => {
          if (resource === 'users') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'approve' })}>Approve</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'block' })}>Block</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'role-admin' })}>Admin role</Button></div>;
          if (resource === 'listings' || resource === 'projects' || resource === 'verification') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'approve' })}>Approve</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'reject' })}>Reject</Button></div>;
          if (resource === 'reports') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'resolve' })}>Resolve</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'dismiss' })}>Dismiss</Button></div>;
          if (resource === 'submissions') return <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'in_progress' })}>In progress</Button><Button variant="ghost" onClick={() => mutation.mutate({ row, action: 'resolved' })}>Resolve</Button></div>;
          if (resource === 'payments') return <Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'reconcile' })}>Reconcile</Button>;
          if (resource === 'system-events' && row.status === 'open') return <Button variant="secondary" onClick={() => mutation.mutate({ row, action: 'resolve' })}>Resolve</Button>;
          return null;
        }}
      />
    </>
  );
}
