'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { InquiryPanel } from '@/components/inquiries/inquiry-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/state';
import { archiveListing, markListingRented, markListingSold, refreshListing } from '@/lib/api/supply';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import { useCurrentUser, useListingOwnerSummary, useListingViewerContext } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';
import { getDashboardListingEditHref, getListingHref } from '@/lib/routes';
import type { Listing, OwnerSummary } from '@/types/marketplace';

export function ListingActionPanel({ listing }: { listing: Listing }) {
  const { data: user, isLoading } = useCurrentUser();
  const context = useListingViewerContext(listing.id, Boolean(user));

  if (isLoading) return <Skeleton className="h-72" />;
  if (!user) return <LoggedOutContactPrompt />;
  if (context.isLoading) return <Skeleton className="h-72" />;

  const viewerContext = context.data;
  if (viewerContext?.canManage) {
    return <OwnerListingActionPanel listing={listing} isAdmin={Boolean(viewerContext.isAdmin)} />;
  }

  return (
    <div className="grid gap-3 self-start lg:sticky lg:top-24">
      <Card className="p-4">
        <div className="grid gap-3">
          <div>
            <h2 className="text-lg font-black">Listing actions</h2>
            <p className="mt-1 text-sm text-muted">Save, compare, or contact the owner/agent.</p>
          </div>
          <FavoriteButton entityType="listing" entityId={listing.id} />
          <Button type="button" variant="secondary">Report listing</Button>
        </div>
      </Card>
      <InquiryPanel subject={listing.title} listingId={listing.id} listerName={listing.listerName} listerRole={listing.listerRole} />
    </div>
  );
}

function LoggedOutContactPrompt() {
  const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}#inquiry` : '/';
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <Card id="inquiry" className="self-start p-4 lg:sticky lg:top-24">
      <div className="grid gap-4">
        <div>
          <h2 className="text-lg font-black">Contact owner/agent</h2>
          <p className="mt-1 text-sm text-muted">Login to contact the owner/agent, save this listing, or start a chat.</p>
        </div>
        <div className="rounded-md border border-line bg-stone-50 p-3 text-sm font-semibold text-muted">
          Phone and WhatsApp are hidden until you are signed in.
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Button href={loginHref} asChild>Login</Button>
          <Button href={registerHref} asChild variant="secondary">Register</Button>
        </div>
      </div>
    </Card>
  );
}

function OwnerListingActionPanel({ listing, isAdmin }: { listing: Listing; isAdmin: boolean }) {
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState('');
  const queryClient = useQueryClient();
  const summary = useListingOwnerSummary(listing.id);
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['listing-owner-summary', listing.id] }),
      queryClient.invalidateQueries({ queryKey: ['listing-viewer-context', listing.id] }),
      queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
    ]);
  };
  const statusMutation = useMutation({
    mutationFn: async (action: 'archive' | 'sold' | 'rented' | 'refresh') => {
      setMessage('');
      setErrorText('');
      if (action === 'archive') return archiveListing(listing.id);
      if (action === 'sold') return markListingSold(listing.id);
      if (action === 'rented') return markListingRented(listing.id);
      return refreshListing(listing.id);
    },
    onSuccess: async (_data, action) => {
      await invalidate();
      setMessage(action === 'refresh' ? 'Listing refreshed.' : 'Listing status updated.');
    },
    onError: (error) => setErrorText(getUserFriendlyErrorMessage(error)),
  });

  function run(action: 'archive' | 'sold' | 'rented' | 'refresh', label: string) {
    if (action !== 'refresh' && !window.confirm(`${label} this listing?`)) return;
    statusMutation.mutate(action);
  }

  return (
    <Card id="inquiry" className="self-start p-4 lg:sticky lg:top-24">
      <div className="grid gap-4">
        <div>
          <h2 className="text-lg font-black">Manage listing</h2>
          <p className="mt-1 text-sm text-muted">You are viewing this as the listing owner or manager.</p>
        </div>
        <OwnerStatsSummary summary={summary.data} loading={summary.isLoading} error={summary.isError} />
        <div className="grid gap-2">
          <Button href={getDashboardListingEditHref(listing.id)} asChild>Edit listing</Button>
          <Button href={`/dashboard/inquiries?listingId=${listing.id}`} asChild variant="secondary">View inquiries / leads</Button>
          <Button href={`/dashboard/chats?listingId=${listing.id}`} asChild variant="secondary">View chats</Button>
          <Button href={getListingHref(listing)} asChild variant="secondary">Preview public page</Button>
        </div>
        <div className="grid gap-2">
          <Button type="button" variant="secondary" disabled={statusMutation.isPending} onClick={() => run('refresh', 'Refresh')}>Refresh listing</Button>
          <Button type="button" variant="secondary" disabled={statusMutation.isPending} onClick={() => run('sold', 'Mark sold')}>Mark sold</Button>
          <Button type="button" variant="secondary" disabled={statusMutation.isPending} onClick={() => run('rented', 'Mark rented')}>Mark rented</Button>
          <Button type="button" variant="ghost" disabled={statusMutation.isPending} onClick={() => run('archive', 'Archive')}>Archive / unpublish</Button>
        </div>
        <Button href="/advertise" asChild variant="secondary">Promote listing</Button>
        {isAdmin ? <AdminModerationActions entityId={listing.id} /> : null}
        {message ? <p className="text-sm font-semibold text-trust">{message}</p> : null}
        {errorText ? <p className="text-sm font-semibold text-red-700">{errorText}</p> : null}
      </div>
    </Card>
  );
}

function OwnerStatsSummary({ summary, loading, error }: { summary?: OwnerSummary; loading: boolean; error: boolean }) {
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
      <p className="text-xs text-muted">Published {formatDate(summary?.publishedAt)} · Refreshed {formatDate(summary?.lastRefreshedAt)}</p>
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

function AdminModerationActions({ entityId }: { entityId: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-line p-3">
      <p className="text-sm font-black">Admin actions</p>
      <Link className="text-sm font-bold text-trust" href={`/admin/listings?listingId=${entityId}`}>Review listing</Link>
      <Link className="text-sm font-bold text-trust" href={`/admin/audit-logs?entityId=${entityId}`}>View audit logs</Link>
      <Link className="text-sm font-bold text-trust" href={`/admin/reports?entityId=${entityId}`}>Moderation reports</Link>
    </div>
  );
}
