import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingSearchClient } from '@/components/search/search-results-client';
import { Skeleton } from '@/components/ui/state';

export const metadata: Metadata = {
  title: 'Rent property in Pakistan',
  description: 'Find fresh rental listings with verified signals and safer inquiry options.',
};

export default function RentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96" /></div>}>
      <ListingSearchClient purpose="rent" />
    </Suspense>
  );
}
