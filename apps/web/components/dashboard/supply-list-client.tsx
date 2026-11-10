'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useMyListings, useMyProjects } from '@/lib/query/hooks';
import { formatDate, formatPrice } from '@/lib/utils';
import { archiveListing, archiveProject, markListingRented, markListingSold, refreshListing, renewListing, type ListingRenewalResult } from '@/lib/api/supply';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import { getDashboardListingEditHref, getDashboardProjectEditHref, getListingHref, getProjectHref } from '@/lib/routes';
import { CheckoutButton } from '@/components/payments/checkout-button';
import type { Listing } from '@/types/marketplace';

type ListingAction =
  | { id: string; type: 'archive' | 'sold' | 'rented' | 'refresh' }
  | { id: string; type: 'renew'; idempotencyKey: string };

export function MyListingsClient() {
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [renewalKeys, setRenewalKeys] = useState<Record<string, string>>({});
  const renewalKeyRef = useRef<Record<string, string>>({});
  const pendingRenewals = useRef(new Set<string>());
  const [statusFilter, setStatusFilter] = useState('all');
  const { data = [], isLoading, isError } = useMyListings();
  const action = useMutation<Listing | ListingRenewalResult, Error, ListingAction>({
    mutationFn: (variables) => {
      setErrorText('');
      setSuccessText('');
      if (variables.type === 'archive') return archiveListing(variables.id);
      if (variables.type === 'sold') return markListingSold(variables.id);
      if (variables.type === 'rented') return markListingRented(variables.id);
      if (variables.type === 'renew') return renewListing(variables.id, variables.idempotencyKey);
      return refreshListing(variables.id);
    },
    onSuccess: (_result, variables) => {
      setErrorText('');
      if (variables.type === 'renew') {
        setSuccessText('Listing renewed for 90 days.');
        delete renewalKeyRef.current[variables.id];
        setRenewalKeys((current) => {
          const next = { ...current };
          delete next[variables.id];
          return next;
        });
      }
      return queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
    onSettled: (_result, _error, variables) => {
      if (variables.type === 'renew') pendingRenewals.current.delete(variables.id);
    },
    onError: (error) => setErrorText(getUserFriendlyErrorMessage(error)),
  });
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Listings failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <div className="grid gap-3"><EmptyState title="No listings yet" message="Post your first property to create a private draft." /><Button asChild href="/dashboard/listings/new">Post property</Button></div>;

  const statuses = Array.from(new Set(data.map((listing) => listing.status).filter((status): status is string => Boolean(status))));
  const visibleListings = statusFilter === 'all' ? data : data.filter((listing) => listing.status === statusFilter);

  function requestRenewal(listing: (typeof data)[number]) {
    if (pendingRenewals.current.has(listing.id)) return;
    if (!window.confirm(`Renew “${listing.title}” for 90 days? This renewal is free.`)) return;
    const idempotencyKey = renewalKeyRef.current[listing.id] ?? globalThis.crypto.randomUUID();
    pendingRenewals.current.add(listing.id);
    renewalKeyRef.current[listing.id] = idempotencyKey;
    setRenewalKeys((current) => ({ ...current, [listing.id]: idempotencyKey }));
    action.mutate({ id: listing.id, type: 'renew', idempotencyKey });
  }

  return (
    <div className="grid gap-4">
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Filter listings by status">
        <button type="button" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${statusFilter === 'all' ? 'border-trust bg-trust text-white' : 'border-line bg-white text-ink'}`}>All <span className="ml-1 opacity-80">{data.length}</span></button>
        {statuses.map((status) => (
          <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${statusFilter === status ? 'border-trust bg-trust text-white' : 'border-line bg-white text-ink'}`}>
            {listingStatusLabel(status)} <span className="ml-1 opacity-80">{data.filter((listing) => listing.status === status).length}</span>
          </button>
        ))}
      </div>
      {errorText ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errorText}</p> : null}
      {successText ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{successText}</p> : null}
      {visibleListings.map((listing) => (
        <Card key={listing.id} className="p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2"><Badge>{listingStatusLabel(listing.status)}</Badge>{listing.verificationStatus ? <InfoChip>{listing.verificationStatus}</InfoChip> : null}</div>
              <h2 className="mt-3 text-lg font-black">{listing.title}</h2>
              <p className="mt-1 text-sm text-muted">{listing.areaName}, {listing.cityName} · {formatPrice(listing.priceAmount)}</p>
              <div className="mt-3 flex flex-wrap gap-2"><InfoChip>Updated {formatDate(listing.updatedAt)}</InfoChip><InfoChip>{listing.publicId}</InfoChip><InfoChip>Expires {listing.expiresAt ? formatDate(listing.expiresAt) : 'Not set'}</InfoChip></div>
              {listing.status === 'active' ? (
                <div className="mt-3 grid justify-items-start gap-2">
                  {listing.renewalEligible ? (
                    <Button type="button" disabled={action.isPending} onClick={() => requestRenewal(listing)}>
                      {renewalKeys[listing.id] ? 'Retry renewal' : 'Renew for 90 days'}
                    </Button>
                  ) : listing.renewalAvailableAt ? (
                    <p className="text-sm text-muted">Renewal available from {formatDate(listing.renewalAvailableAt)}.</p>
                  ) : (
                    <p className="text-sm text-muted">Renewal unavailable because this listing has no expiry date.</p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Renewal is available for active listings only.</p>
              )}
            </div>
            <div className="grid gap-2 sm:min-w-64">
              <div className="grid grid-cols-2 gap-2"><Button asChild href={getDashboardListingEditHref(listing.id)}>Edit listing</Button><Button asChild href={getListingHref(listing)} variant="secondary">Preview</Button></div>
              <div className="grid grid-cols-2 gap-2"><Button asChild href={`/dashboard/inquiries?listingId=${listing.id}`} variant="secondary">View leads</Button><Button asChild href={`/dashboard/chats?listingId=${listing.id}`} variant="secondary">Messages</Button></div>
              <details className="rounded-md border border-line bg-white p-3">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">More listing actions</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <CheckoutButton payload={{ packageCode: 'listing_hot', entityType: 'listing', entityId: listing.id }} variant="secondary">Make Hot</CheckoutButton>
                  <CheckoutButton payload={{ packageCode: 'listing_super_hot', entityType: 'listing', entityId: listing.id }} variant="secondary">Make Featured</CheckoutButton>
                  <Button type="button" variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ id: listing.id, type: 'refresh' })}>Refresh</Button>
                  <Button type="button" variant="secondary" disabled={action.isPending} onClick={() => window.confirm('Mark this listing sold?') && action.mutate({ id: listing.id, type: 'sold' })}>Mark sold</Button>
                  <Button type="button" variant="secondary" disabled={action.isPending} onClick={() => window.confirm('Mark this listing rented?') && action.mutate({ id: listing.id, type: 'rented' })}>Mark rented</Button>
                  <Button type="button" variant="ghost" disabled={action.isPending} onClick={() => window.confirm('Archive this listing?') && action.mutate({ id: listing.id, type: 'archive' })}>Archive</Button>
                </div>
              </details>
            </div>
          </div>
        </Card>
      ))}
      {!visibleListings.length ? <EmptyState title="No listings in this status" message="Choose another status to view your properties." /> : null}
      <Link href="/dashboard/listings/new" className="text-sm font-bold text-trust">Add listing</Link>
    </div>
  );
}

function listingStatusLabel(status?: string) {
  if (!status) return 'Status unavailable';
  return status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function MyProjectsClient() {
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState('');
  const { data = [], isLoading, isError } = useMyProjects();
  const archive = useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
    onError: (error) => setErrorText(getUserFriendlyErrorMessage(error)),
  });
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Projects failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No projects yet" message="Add project flow is planned for the next frontend sprint." />;

  return (
    <div className="grid gap-4">
      {errorText ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errorText}</p> : null}
      {data.map((project) => (
        <Card key={project.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge className="bg-sky-50 text-sky">{project.legalStatus ?? project.verificationStatus ?? 'project'}</Badge>
              <h2 className="mt-3 text-lg font-black">{project.name}</h2>
              <p className="mt-1 text-sm text-muted">{project.areaName}, {project.cityName} · {formatPrice(project.minPriceAmount)} onward</p>
              <div className="mt-3 flex flex-wrap gap-2"><InfoChip>{project.possessionStatus ?? 'status pending'}</InfoChip><InfoChip>{project.developerName}</InfoChip></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild href={getProjectHref(project)} variant="secondary">Preview</Button>
              <Button asChild href={getDashboardProjectEditHref(project.id)}>Edit</Button>
              <Button asChild href={`/dashboard/inquiries?projectId=${project.id}`} variant="secondary">View leads</Button>
              <Button asChild href={`/dashboard/chats?projectId=${project.id}`} variant="secondary">Messages</Button>
              <CheckoutButton payload={{ packageCode: 'project_spotlight', entityType: 'project', entityId: project.id }} variant="secondary">Promote Project</CheckoutButton>
              <CheckoutButton payload={{ packageCode: 'project_featured', entityType: 'project', entityId: project.id }} variant="secondary">Feature Project</CheckoutButton>
              <Button type="button" variant="ghost" disabled={archive.isPending} onClick={() => window.confirm('Archive this project?') && archive.mutate(project.id)}>Archive</Button>
            </div>
          </div>
        </Card>
      ))}
      <Link href="/dashboard/projects/new" className="text-sm font-bold text-trust">Add project</Link>
    </div>
  );
}
