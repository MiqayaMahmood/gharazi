import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingSearchClient } from '@/components/search/search-results-client';
import { Skeleton } from '@/components/ui/state';
import { createMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = createMetadata({ title: 'Properties for Rent in Pakistan', description: 'Find houses, apartments and commercial properties for rent across Pakistan with fresh listings and safer inquiry options.', path: '/rent' });

export default function RentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96" /></div>}>
      <ListingSearchClient purpose="rent" />
    </Suspense>
  );
}
