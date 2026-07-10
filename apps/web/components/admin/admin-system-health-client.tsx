'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminError, AdminLoading, AdminPageHeader, StatusBadge, formatDate } from './admin-primitives';
import { useAdminSystemEvents, useAdminSystemHealth } from '@/lib/query/hooks';

type HealthItem = { status?: unknown; message?: unknown; checkedAt?: unknown; latencyMs?: unknown; lastError?: unknown; stats?: unknown };

export function AdminSystemHealthClient() {
  const health = useAdminSystemHealth(); const events = useAdminSystemEvents();
  if (health.isLoading) return <AdminLoading />;
  if (health.isError || !health.data) return <AdminError message="System health could not be loaded. Verify API access and dependency connectivity." />;
  const services = (health.data.services ?? {}) as Record<string, HealthItem>;
  return <>
    <AdminPageHeader title="System Health" description={`Overall status: ${String(health.data.status ?? 'unknown')}. Checks refresh every 30 seconds.`} action={<Button asChild href="/admin/system-events" variant="secondary">Recent system events</Button>} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(services).map(([name, item]) => <Card key={name} className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="font-black capitalize">{name}</h2><StatusBadge value={item.status} /></div>
        <p className="mt-3 text-sm text-muted">{String(item.message ?? 'No message')}</p>
        <div className="mt-4 grid gap-1 text-xs text-muted"><span>Checked: {formatDate(item.checkedAt)}</span>{item.latencyMs !== undefined ? <span>Latency: {String(item.latencyMs)} ms</span> : null}{item.lastError ? <span className="text-red-700">Last error: {String(item.lastError)}</span> : null}</div>
      </Card>)}
    </div>
    <Card className="mt-6 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Recent errors</h2><Link className="text-sm font-bold text-trust" href="/admin/system-events">View all</Link></div><div className="mt-4 grid gap-2">{(events.data ?? []).slice(0, 5).map((event) => <div key={String(event.id)} className="rounded-md border border-line p-3"><div className="flex justify-between gap-3"><p className="font-semibold">{String(event.message)}</p><StatusBadge value={event.severity} /></div><p className="mt-1 text-xs text-muted">{String(event.source)} · {formatDate(event.createdAt)} · {String(event.requestId ?? 'no request ID')}</p></div>)}{!events.data?.length ? <p className="text-sm text-muted">No system events recorded.</p> : null}</div></Card>
  </>;
}
