'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader, AdminLoading, AdminError, StatusBadge, formatDate } from './admin-primitives';
import { useAdminOverview, useAdminReports, useAdminVerificationRequests, useAdminSubmissions, useAdminAnalyticsSummary, useAdminSystemHealth } from '@/lib/query/hooks';

export function AdminOverviewClient() {
  const [range, setRange] = useState('current_month');
  const overview = useAdminOverview();
  const reports = useAdminReports();
  const verifications = useAdminVerificationRequests();
  const submissions = useAdminSubmissions();
  const analytics = useAdminAnalyticsSummary(range);
  const systemHealth = useAdminSystemHealth();

  if (overview.isLoading) return <AdminLoading />;
  if (overview.isError) return <AdminError />;

  const cards: Array<[string, ReactNode]> = [
    ['Total users', overview.data?.users],
    ['Listings', overview.data?.listings],
    ['Projects', overview.data?.projects],
    ['Open reports', overview.data?.openReports],
    ['Pending verification', overview.data?.pendingVerificationRequests],
    ['New submissions', submissions.data?.filter((item) => item.status === 'new').length],
    ['Active promotions', String(analytics.data?.activePromotions ?? '-')],
    ['Active subscriptions', String(analytics.data?.activeSubscriptions ?? '-')],
    ['New users', String(analytics.data?.newUsers ?? '-')],
    ['Published listings', String(analytics.data?.publishedListings ?? '-')],
    ['Listing views', String(analytics.data?.listingViews ?? '-')],
    ['Project views', String(analytics.data?.projectViews ?? '-')],
    ['Favorites', String(analytics.data?.favoritesCreated ?? '-')],
    ['Newsletter subscribers', String(analytics.data?.newsletterSubscribers ?? '-')],
    ['Open critical alerts', String(overview.data?.openCriticalAlerts ?? '-')],
    ['Payment failures today', String(overview.data?.paymentFailuresToday ?? '-')],
    ['System status', String(systemHealth.data?.status ?? 'checking')],
  ];

  return (
    <>
      <AdminPageHeader
        title="Admin Overview"
        description="Operational snapshot across marketplace quality, users, trust queues, and commercial activity."
        action={<div className="flex flex-wrap gap-2">
          <select className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="current_month">Current month</option>
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 days</option>
            <option value="previous_month">Previous month</option>
          </select>
          <Button href="/admin/users" asChild variant="secondary">Manage users</Button>
          <Button href="/admin/system-health" asChild variant="secondary">System health</Button>
        </div>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className="mt-3 text-3xl font-black text-ink">{value ?? '-'}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-ink">Top viewed listings</h3>
            <Button href="/admin/analytics" asChild variant="ghost">Analytics</Button>
          </div>
          <div className="grid gap-3">
            {Array.isArray(analytics.data?.topListings) && analytics.data.topListings.length ? analytics.data.topListings.map((listing) => (
              <div key={String(listing.id)} className="rounded-md border border-line p-3">
                <p className="font-semibold text-ink">{String(listing.title ?? listing.publicId ?? 'Listing')}</p>
                <p className="mt-1 text-xs text-muted">{String(listing.viewsCount ?? 0)} views</p>
              </div>
            )) : <p className="text-sm text-muted">No listing view stats for this range yet.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-ink">Top viewed projects</h3>
            <Button href="/admin/analytics" asChild variant="ghost">Analytics</Button>
          </div>
          <div className="grid gap-3">
            {Array.isArray(analytics.data?.topProjects) && analytics.data.topProjects.length ? analytics.data.topProjects.map((project) => (
              <div key={String(project.id)} className="rounded-md border border-line p-3">
                <p className="font-semibold text-ink">{String(project.name ?? project.slug ?? 'Project')}</p>
                <p className="mt-1 text-xs text-muted">{String(project.viewsCount ?? 0)} views</p>
              </div>
            )) : <p className="text-sm text-muted">No project view stats for this range yet.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-ink">Recent reports</h3>
            <Button href="/admin/reports" asChild variant="ghost">Open queue</Button>
          </div>
          <div className="grid gap-3">
            {(reports.data ?? []).slice(0, 5).map((report) => (
              <div key={String(report.id)} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{String(report.reasonCode ?? report.entityType ?? 'Report')}</p>
                  <StatusBadge value={report.status} />
                </div>
                <p className="mt-1 text-xs text-muted">{formatDate(report.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-ink">Verification requests</h3>
            <Button href="/admin/verification-requests" asChild variant="ghost">Review</Button>
          </div>
          <div className="grid gap-3">
            {(verifications.data ?? []).slice(0, 5).map((request) => (
              <div key={String(request.id)} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{String(request.requestType ?? 'Verification')}</p>
                  <StatusBadge value={request.status} />
                </div>
                <p className="mt-1 text-xs text-muted">{formatDate(request.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
