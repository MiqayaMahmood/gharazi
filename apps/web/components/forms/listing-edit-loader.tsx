'use client';

import { ListingFormClient } from './listing-form-client';
import { EmptyState, Skeleton } from '@/components/ui/state';
import { useMyListings } from '@/lib/query/hooks';

export function ListingEditLoader({ id }: { id: string }) {
  const { data = [], isLoading } = useMyListings();
  if (isLoading) return <Skeleton className="h-96" />;
  const listing = data.find((item) => item.id === id || item.publicId === id);
  if (!listing) return <EmptyState title="Listing not found" message="The listing may be archived or unavailable for this account." />;
  return <ListingFormClient initialListing={listing} />;
}
