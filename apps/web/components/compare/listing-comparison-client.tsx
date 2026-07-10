'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useBatchListings } from '@/lib/query/hooks';
import { getListingHref } from '@/lib/routes';
import { formatDate, formatPrice } from '@/lib/utils';
import { useCompareStore } from '@/stores/ui-store';

const rows = [
  ['Price', (id: string, lookup: ListingLookup) => formatPrice(lookup[id]?.priceAmount)],
  ['Location', (id: string, lookup: ListingLookup) => `${lookup[id]?.areaName}, ${lookup[id]?.cityName}`],
  ['Type', (id: string, lookup: ListingLookup) => lookup[id]?.propertyTypeName ?? '-'],
  ['Beds / baths', (id: string, lookup: ListingLookup) => `${lookup[id]?.bedrooms ?? '-'} / ${lookup[id]?.bathrooms ?? '-'}`],
  ['Area', (id: string, lookup: ListingLookup) => `${lookup[id]?.areaValue ?? '-'} ${lookup[id]?.areaUnit ?? ''}`],
  ['Verification', (id: string, lookup: ListingLookup) => lookup[id]?.verificationStatus ?? 'Pending'],
  ['Updated', (id: string, lookup: ListingLookup) => formatDate(lookup[id]?.updatedAt)],
  ['Amenities', (id: string, lookup: ListingLookup) => lookup[id]?.amenities?.map((amenity) => amenity.name).join(', ') || '-'],
];

type ListingLookup = Record<string, import('@/types/marketplace').Listing | undefined>;

export function ListingComparisonClient() {
  const ids = useCompareStore((state) => state.listingIds);
  const remove = useCompareStore((state) => state.removeListing);
  const clear = useCompareStore((state) => state.clearListings);
  const query = useBatchListings(ids);
  const lookup = Object.fromEntries((query.data ?? []).map((listing) => [listing.id, listing])) as ListingLookup;
  const validIds = ids.filter((id) => lookup[id]);
  const staleIds = ids.filter((id) => query.data && !lookup[id]);

  if (!ids.length) return <EmptyState title="No listings selected" message="Use Compare on listing cards or detail pages to build a 2-4 item shortlist." />;
  if (query.isLoading) return <Skeleton className="h-96" />;
  if (query.isError) return <ErrorState title="Compare data unavailable" message="The selected listings could not be loaded from the backend. Try refreshing or clearing stale items." />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm text-muted">Compare up to 4 listings side by side.</p>
        <Button variant="secondary" onClick={clear}>Clear comparison</Button>
      </div>
      <Card className="overflow-auto">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-line p-3 text-left">Field</th>
              {validIds.map((id) => (
                <th key={id} className="border-b border-line p-3 text-left">
                  {lookup[id] ? <Link className="font-black text-trust" href={getListingHref(lookup[id])}>{lookup[id]?.title}</Link> : null}
                  <Button className="mt-2" variant="ghost" onClick={() => remove(id)}>Remove</Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, getter]) => (
              <tr key={label as string}>
                <td className="border-b border-line bg-stone-50 p-3 font-bold">{label as string}</td>
                {validIds.map((id) => <td key={id} className="border-b border-line p-3">{(getter as (id: string, lookup: ListingLookup) => string)(id, lookup)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {staleIds.length ? <Button variant="secondary" onClick={() => staleIds.forEach(remove)}>Remove {staleIds.length} unavailable item{staleIds.length > 1 ? 's' : ''}</Button> : null}
    </div>
  );
}
