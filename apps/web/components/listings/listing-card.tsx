import Image from 'next/image';
import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatArea, formatDate, formatPrice } from '@/lib/utils';
import type { Listing } from '@/types/marketplace';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { CompareButton } from '@/components/compare/compare-button';
import { AuthActionLink } from '@/components/auth/auth-action-link';
import { getListingHref } from '@/lib/routes';

export function ListingCard({ listing }: { listing: Listing }) {
  const detailsHref = getListingHref(listing);
  const purposeLabel = listing.purposeSlug === 'rent' ? 'For rent' : listing.purposeSlug === 'sale' ? 'For sale' : null;
  const areaLabel = formatArea(listing.areaValue, listing.areaUnit);

  return (
    <Card className="relative overflow-hidden">
      <Link href={detailsHref} aria-label={`View details for ${listing.title}`} className="relative block aspect-[16/10] bg-stone-200">
        {listing.coverImageUrl ? <Image src={listing.coverImageUrl} alt={`${listing.title} in ${listing.areaName}, ${listing.cityName}`} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /> : null}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1.5">
          {purposeLabel ? <Badge>{purposeLabel}</Badge> : null}
          {listing.isFeatured || listing.isHot ? <Badge className="bg-amber-50 text-amber-900">{listing.isFeatured ? 'Featured' : 'Hot'}</Badge> : null}
        </div>
      </Link>
      <div className="absolute right-3 top-3"><FavoriteButton compact entityType="listing" entityId={listing.id} /></div>
      <div className="grid gap-3 p-3.5 sm:p-4">
        <div>
          <p className="text-xl font-black text-ink">{formatPrice(listing.priceAmount)}</p>
          <h2 className="mt-1 line-clamp-2 font-bold">{listing.title}</h2>
          <p className="mt-1 line-clamp-1 text-sm text-muted">{[listing.areaName, listing.cityName].filter(Boolean).join(', ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {listing.propertyTypeName ? <InfoChip>{listing.propertyTypeName}</InfoChip> : null}
          {listing.bedrooms ? <InfoChip>{listing.bedrooms} beds</InfoChip> : null}
          {listing.bathrooms ? <InfoChip>{listing.bathrooms} baths</InfoChip> : null}
          {areaLabel ? <InfoChip>{areaLabel}</InfoChip> : null}
          {listing.verificationStatus === 'verified' ? <InfoChip>Verified</InfoChip> : null}
        </div>
        {listing.updatedAt ? <p className="text-xs text-muted">Updated {formatDate(listing.updatedAt)}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button href={detailsHref} asChild className="flex-1">View details</Button>
          <AuthActionLink
            href={`${detailsHref}#inquiry`}
            className="flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-3 text-center text-sm font-bold text-trust hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust"
            ariaLabel={`Chat or inquire about ${listing.title}`}
          >
            Inquire
          </AuthActionLink>
        </div>
        <CompareButton className="w-full" type="listing" id={listing.id} />
      </div>
    </Card>
  );
}
