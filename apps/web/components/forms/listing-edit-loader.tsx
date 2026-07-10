'use client';

import { ListingFormClient } from './listing-form-client';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useMyListing } from '@/lib/query/hooks';

export function ListingEditLoader({ id }: { id: string }) {
  const { data: listing, isLoading, isError } = useMyListing(id);
  if (isLoading) return <Skeleton className="h-96" />;
  if (isError) return <ErrorState title="Listing failed to load" message="Refresh the page or check that this listing belongs to your account." />;
  if (!listing) return <EmptyState title="Listing not found" message="The listing may be archived or unavailable for this account." />;
  return <ListingFormClient initialListing={listing} />;
}
