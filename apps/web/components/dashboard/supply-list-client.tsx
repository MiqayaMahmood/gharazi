'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useMyListings, useMyProjects } from '@/lib/query/hooks';
import { formatDate, formatPrice } from '@/lib/utils';
import { archiveListing, archiveProject, markListingRented, markListingSold, refreshListing } from '@/lib/api/supply';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import { getDashboardListingEditHref, getDashboardProjectEditHref, getListingHref, getProjectHref } from '@/lib/routes';
import { CheckoutButton } from '@/components/payments/checkout-button';

export function MyListingsClient() {
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState('');
  const { data = [], isLoading, isError } = useMyListings();
  const action = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'archive' | 'sold' | 'rented' | 'refresh' }) => {
      setErrorText('');
      if (type === 'archive') return archiveListing(id);
      if (type === 'sold') return markListingSold(id);
      if (type === 'rented') return markListingRented(id);
      return refreshListing(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
    onError: (error) => setErrorText(getUserFriendlyErrorMessage(error)),
  });
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Listings failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No listings yet" message="Add listing flow is planned for the next frontend sprint." />;

  return (
    <div className="grid gap-4">
      {errorText ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errorText}</p> : null}
      {data.map((listing) => (
        <Card key={listing.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge>{listing.verificationStatus ?? 'draft/active'}</Badge>
              <h2 className="mt-3 text-lg font-black">{listing.title}</h2>
              <p className="mt-1 text-sm text-muted">{listing.areaName}, {listing.cityName} · {formatPrice(listing.priceAmount)}</p>
              <div className="mt-3 flex flex-wrap gap-2"><InfoChip>Updated {formatDate(listing.updatedAt)}</InfoChip><InfoChip>{listing.publicId}</InfoChip></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild href={getListingHref(listing)} variant="secondary">Preview</Button>
              <Button asChild href={getDashboardListingEditHref(listing.id)}>Edit</Button>
              <Button asChild href={`/dashboard/inquiries?listingId=${listing.id}`} variant="secondary">View leads</Button>
              <Button asChild href={`/dashboard/chats?listingId=${listing.id}`} variant="secondary">Messages</Button>
              <CheckoutButton payload={{ packageCode: 'listing_hot', entityType: 'listing', entityId: listing.id }} variant="secondary">Make Hot</CheckoutButton>
              <CheckoutButton payload={{ packageCode: 'listing_super_hot', entityType: 'listing', entityId: listing.id }} variant="secondary">Make Featured</CheckoutButton>
              <Button type="button" variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ id: listing.id, type: 'refresh' })}>Refresh</Button>
              <Button type="button" variant="secondary" disabled={action.isPending} onClick={() => window.confirm('Mark this listing sold?') && action.mutate({ id: listing.id, type: 'sold' })}>Mark sold</Button>
              <Button type="button" variant="secondary" disabled={action.isPending} onClick={() => window.confirm('Mark this listing rented?') && action.mutate({ id: listing.id, type: 'rented' })}>Mark rented</Button>
              <Button type="button" variant="ghost" disabled={action.isPending} onClick={() => window.confirm('Archive this listing?') && action.mutate({ id: listing.id, type: 'archive' })}>Archive</Button>
            </div>
          </div>
        </Card>
      ))}
      <Link href="/dashboard/listings/new" className="text-sm font-bold text-trust">Add listing</Link>
    </div>
  );
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
