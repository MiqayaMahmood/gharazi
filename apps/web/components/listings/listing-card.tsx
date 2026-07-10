import Image from 'next/image';
import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate, formatPrice } from '@/lib/utils';
import type { Listing } from '@/types/marketplace';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { CompareButton } from '@/components/compare/compare-button';
import { AuthActionLink } from '@/components/auth/auth-action-link';
import { getListingHref } from '@/lib/routes';

export function ListingCard({ listing }: { listing: Listing }) {
  const detailsHref = getListingHref(listing);

  return (
    <Card className="overflow-hidden">
      <Link href={detailsHref} aria-label={`View details for ${listing.title}`} className="relative block aspect-[4/3] bg-stone-200">
        {listing.coverImageUrl ? <Image src={listing.coverImageUrl} alt="" fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /> : null}
        {listing.verificationStatus === 'verified' ? <Badge className="absolute left-3 top-3">Verified</Badge> : null}
      </Link>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-lg font-black text-ink">{formatPrice(listing.priceAmount)}</p>
          <h2 className="mt-1 line-clamp-2 font-bold">{listing.title}</h2>
          <p className="mt-1 text-sm text-muted">{listing.areaName}, {listing.cityName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {listing.bedrooms ? <InfoChip>{listing.bedrooms} beds</InfoChip> : null}
          {listing.bathrooms ? <InfoChip>{listing.bathrooms} baths</InfoChip> : null}
          <InfoChip>{listing.areaValue} {listing.areaUnit}</InfoChip>
          <InfoChip>{formatDate(listing.updatedAt)}</InfoChip>
        </div>
        <div className="flex gap-2">
          <Button href={detailsHref} asChild className="flex-1">View details</Button>
          <FavoriteButton entityType="listing" entityId={listing.id} />
        </div>
        <CompareButton type="listing" id={listing.id} />
        <AuthActionLink
          href={`${detailsHref}#inquiry`}
          className="text-left text-sm font-bold text-trust disabled:cursor-not-allowed disabled:opacity-60"
          ariaLabel={`Chat or inquire about ${listing.title}`}
        >
          Chat / inquire
        </AuthActionLink>
      </div>
    </Card>
  );
}
