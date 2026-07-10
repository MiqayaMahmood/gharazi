import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingGallery } from '@/components/listings/listing-gallery';
import { ListingActionPanel } from '@/components/listings/listing-action-panel';
import { CompareButton } from '@/components/compare/compare-button';
import { RelatedGuides } from '@/components/content/blog-card';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { GlobalSearchBar } from '@/components/search/global-search-bar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { ListingDisclaimer, SponsoredDisclaimer } from '@/components/legal/disclaimers';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { getListing, getSimilarListings } from '@/lib/api/marketplace';
import { getAreaHref, getCityBuyHref, getCityRentHref } from '@/lib/routes';
import { formatDate, formatPrice } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const listing = await getListing(publicId);
  return {
    title: listing.title,
    description: `${listing.title} in ${listing.areaName}, ${listing.cityName}. ${formatPrice(listing.priceAmount)}.`,
    alternates: { canonical: `/listing/${publicId}` },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [listing, guides] = await Promise.all([getListing(publicId), listLatestBlogPosts(3)]);
  if (!listing) notFound();
  const similarListings = await getSimilarListings(listing.id).catch(() => []);
  const displayedSimilarListings = similarListings.filter((item) => item.publicId !== listing.publicId).slice(0, 3);
  const isRent = listing.purposeSlug?.toLowerCase().includes('rent');
  const purposeLabel = isRent ? 'Rent' : 'Buy';
  const cityHref = listing.citySlug ? (isRent ? getCityRentHref(listing.citySlug) : getCityBuyHref(listing.citySlug)) : isRent ? '/rent' : '/buy';
  const areaHref = listing.areaSlug ? getAreaHref(listing.areaSlug) : undefined;

  return (
    <>
    <ViewTracker eventType="listing_viewed" entityType="listing" entityId={listing.id} metadataJson={{ publicId: listing.publicId }} />
    <GlobalSearchBar initialTab={isRent ? 'rent' : 'buy'} compact />
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: purposeLabel, href: isRent ? '/rent' : '/buy' },
        { label: listing.cityName, href: cityHref },
        { label: listing.areaName, href: areaHref },
        { label: listing.publicId },
      ]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid gap-6">
          <ListingGallery images={listing.images} title={listing.title} />
          <section>
            <div className="flex flex-wrap gap-2">
              {listing.verificationStatus === 'verified' ? <Badge>Verified</Badge> : null}
              {listing.isFeatured ? <Badge className="bg-amber-50 text-saffron">Featured</Badge> : null}
              <InfoChip>Updated {formatDate(listing.updatedAt)}</InfoChip>
            </div>
            <h1 className="mt-4 text-3xl font-black">{listing.title}</h1>
            <p className="mt-2 text-2xl font-black text-trust">{formatPrice(listing.priceAmount)}</p>
            <p className="mt-2 text-muted">{areaHref ? <a className="font-semibold text-trust" href={areaHref}>{listing.areaName}</a> : listing.areaName}, {listing.cityName}</p>
            <div className="mt-4 flex flex-wrap gap-2"><CompareButton type="listing" id={listing.id} /></div>
          </section>
          <ListingDisclaimer />
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="p-4"><p className="text-sm text-muted">Beds</p><p className="text-xl font-black">{listing.bedrooms ?? '-'}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted">Baths</p><p className="text-xl font-black">{listing.bathrooms ?? '-'}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted">Area</p><p className="text-xl font-black">{listing.areaValue} {listing.areaUnit}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted">Type</p><p className="text-xl font-black">{listing.propertyTypeName}</p></Card>
          </div>
          <Card className="p-5"><h2 className="text-xl font-black">Description</h2><p className="mt-3 leading-7 text-muted">{listing.description}</p></Card>
          <Card className="p-5">
            <h2 className="text-xl font-black">Amenities</h2>
            {listing.amenities?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.amenities.map((amenity, index) => <InfoChip key={amenity.id ?? amenity.code ?? amenity.slug ?? `${amenity.name}-${index}`}>{amenity.name}</InfoChip>)}
              </div>
            ) : <p className="mt-3 text-sm text-muted">No amenities listed yet.</p>}
          </Card>
          <Card className="p-5"><h2 className="text-xl font-black">Location</h2><div className="mt-3 flex h-52 items-center justify-center rounded-lg bg-stone-100 text-sm font-semibold text-muted">Map placeholder for {listing.areaName}</div></Card>
          <Card className="p-5"><h2 className="text-xl font-black">Lister</h2><p className="mt-2 font-bold">{listing.listerName}</p><p className="text-sm text-muted">{listing.listerRole}</p><p className="mt-3 text-xs text-muted">Listing ID: {listing.publicId}</p><Button className="mt-4" variant="secondary">Report listing</Button></Card>
          <section>
            <h2 className="mb-4 text-xl font-black">{displayedSimilarListings.some((item) => item.isFeatured) ? 'Featured similar listings' : 'Similar listings'}</h2>
            <SponsoredDisclaimer className="mb-4" />
            {displayedSimilarListings.length ? (
              <div className="grid gap-4 md:grid-cols-3">{displayedSimilarListings.map((item) => <ListingCard key={item.id} listing={item} />)}</div>
            ) : <EmptyState title="No similar listings yet" message="Related properties will appear here as matching inventory is published." />}
          </section>
          <RelatedGuides posts={guides} />
        </div>
        <ListingActionPanel listing={listing} />
      </div>
    </div>
    </>
  );
}
