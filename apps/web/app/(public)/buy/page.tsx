import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingSearchClient } from '@/components/search/search-results-client';
import { Skeleton } from '@/components/ui/state';

export const metadata: Metadata = {
  title: 'Buy property in Pakistan',
  description: 'Search verified houses, apartments, plots, and commercial properties for sale in Pakistan.',
};

export default function BuyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96" /></div>}>
      <ListingSearchClient purpose="buy" />
    </Suspense>
  );
}
