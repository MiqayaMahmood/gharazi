'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { InquiryPanel } from '@/components/inquiries/inquiry-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/state';
import { archiveProject } from '@/lib/api/supply';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import { useCurrentUser, useProjectOwnerSummary, useProjectViewerContext } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';
import { getDashboardProjectEditHref, getProjectHref } from '@/lib/routes';
import type { OwnerSummary, Project } from '@/types/marketplace';

export function ProjectActionPanel({ project }: { project: Project }) {
  const { data: user, isLoading } = useCurrentUser();
  const context = useProjectViewerContext(project.id, Boolean(user));

  if (isLoading) return <Skeleton className="h-72" />;
  if (!user) return <LoggedOutProjectPrompt />;
  if (context.isLoading) return <Skeleton className="h-72" />;

  if (context.data?.canManage) {
    return <OwnerProjectActionPanel project={project} isAdmin={Boolean(context.data.isAdmin)} />;
  }

  return (
    <div className="grid gap-3 self-start lg:sticky lg:top-24">
      <Card className="p-4">
        <div className="grid gap-3">
          <div>
            <h2 className="text-lg font-black">Project actions</h2>
            <p className="mt-1 text-sm text-muted">Save or contact the developer.</p>
          </div>
          <FavoriteButton entityType="project" entityId={project.id} />
          <Button type="button" variant="secondary">Report project</Button>
        </div>
      </Card>
      <InquiryPanel subject={project.name} projectId={project.id} listerName={project.developerName} listerRole="Developer" />
    </div>
  );
}

function LoggedOutProjectPrompt() {
  const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}#inquiry` : '/';
  return (
    <Card id="inquiry" className="self-start p-4 lg:sticky lg:top-24">
      <div className="grid gap-4">
        <div>
          <h2 className="text-lg font-black">Request project details</h2>
          <p className="mt-1 text-sm text-muted">Login to contact the developer, save this project, or start a chat.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Button href={`/login?returnTo=${encodeURIComponent(returnTo)}`} asChild>Login</Button>
          <Button href={`/register?returnTo=${encodeURIComponent(returnTo)}`} asChild variant="secondary">Register</Button>
        </div>
      </div>
    </Card>
  );
}

function OwnerProjectActionPanel({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState('');
  const summary = useProjectOwnerSummary(project.id);
  const queryClient = useQueryClient();
  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(project.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-owner-summary', project.id] }),
        queryClient.invalidateQueries({ queryKey: ['project-viewer-context', project.id] }),
        queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
      ]);
      setMessage('Project archived.');
    },
    onError: (error) => setErrorText(getUserFriendlyErrorMessage(error)),
  });

  return (
    <Card id="inquiry" className="self-start p-4 lg:sticky lg:top-24">
      <div className="grid gap-4">
        <div>
          <h2 className="text-lg font-black">Manage project</h2>
          <p className="mt-1 text-sm text-muted">You are viewing this as the developer or manager.</p>
        </div>
        <ProjectStatsSummary summary={summary.data} loading={summary.isLoading} error={summary.isError} />
        <div className="grid gap-2">
          <Button href={getDashboardProjectEditHref(project.id)} asChild>Edit project</Button>
          <Button href={`/dashboard/inquiries?projectId=${project.id}`} asChild variant="secondary">View project inquiries</Button>
          <Button href={`/dashboard/chats?projectId=${project.id}`} asChild variant="secondary">View chats</Button>
          <Button href={getProjectHref(project)} asChild variant="secondary">Preview public page</Button>
          <Button href="/advertise" asChild variant="secondary">Promote project</Button>
          <Button type="button" variant="ghost" disabled={archiveMutation.isPending} onClick={() => window.confirm('Archive this project?') && archiveMutation.mutate()}>Archive / unpublish</Button>
        </div>
        {isAdmin ? <AdminProjectActions entityId={project.id} /> : null}
        {message ? <p className="text-sm font-semibold text-trust">{message}</p> : null}
        {errorText ? <p className="text-sm font-semibold text-red-700">{errorText}</p> : null}
      </div>
    </Card>
  );
}

function ProjectStatsSummary({ summary, loading, error }: { summary?: OwnerSummary; loading: boolean; error: boolean }) {
  if (loading) return <Skeleton className="h-28" />;
  if (error) return <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Stats are temporarily unavailable.</p>;
  return (
    <div className="grid gap-2 rounded-md border border-line bg-stone-50 p-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Views" value={summary?.views ?? 0} />
        <Stat label="Saves" value={summary?.favorites ?? 0} />
        <Stat label="Inquiries" value={summary?.inquiries ?? 0} />
        <Stat label="Chats" value={summary?.chats ?? 0} />
      </div>
      <p className="text-xs font-semibold text-muted">Status: {summary?.status ?? 'unknown'} · {summary?.searchVisibility ?? 'Visibility pending'}</p>
      <p className="text-xs text-muted">Published {formatDate(summary?.publishedAt)}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function AdminProjectActions({ entityId }: { entityId: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-line p-3">
      <p className="text-sm font-black">Admin actions</p>
      <Link className="text-sm font-bold text-trust" href={`/admin/projects?projectId=${entityId}`}>Review project</Link>
      <Link className="text-sm font-bold text-trust" href={`/admin/audit-logs?entityId=${entityId}`}>View audit logs</Link>
    </div>
  );
}
