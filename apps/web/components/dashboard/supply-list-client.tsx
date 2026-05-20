'use client';

import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useMyListings, useMyProjects } from '@/lib/query/hooks';
import { formatDate, formatPrice } from '@/lib/utils';

export function MyListingsClient() {
  const { data = [], isLoading, isError } = useMyListings();
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Listings failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No listings yet" message="Add listing flow is planned for the next frontend sprint." />;

  return (
    <div className="grid gap-4">
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
              <Button asChild href={`/listing/${listing.publicId}`} variant="secondary">View</Button>
              <Button asChild href={`/dashboard/listings/${listing.id}/edit`} variant="ghost">Edit</Button>
            </div>
          </div>
        </Card>
      ))}
      <Link href="/dashboard/listings/new" className="text-sm font-bold text-trust">Add listing</Link>
    </div>
  );
}

export function MyProjectsClient() {
  const { data = [], isLoading, isError } = useMyProjects();
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Projects failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No projects yet" message="Add project flow is planned for the next frontend sprint." />;

  return (
    <div className="grid gap-4">
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
              <Button asChild href={`/project/${project.slug}`} variant="secondary">View</Button>
              <Button asChild href={`/dashboard/projects/${project.id}/edit`} variant="ghost">Edit</Button>
            </div>
          </div>
        </Card>
      ))}
      <Link href="/dashboard/projects/new" className="text-sm font-bold text-trust">Add project</Link>
    </div>
  );
}
