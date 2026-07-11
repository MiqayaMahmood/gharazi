import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingSearchClient } from '@/components/search/search-results-client';
import { Skeleton } from '@/components/ui/state';
import { createMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = createMetadata({ title: 'Properties for Sale in Pakistan', description: 'Browse verified houses, plots, apartments and commercial properties available for sale across Pakistan.', path: '/buy' });

export default function BuyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96" /></div>}>
      <ListingSearchClient purpose="buy" />
    </Suspense>
  );
}
