import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { ListingCard } from '@/components/listings/listing-card';
import { ProjectCard } from '@/components/projects/project-card';
import { ListingGallery } from '@/components/listings/listing-gallery';
import { ListingActionPanel } from '@/components/listings/listing-action-panel';
import { MobileListingContactActions } from '@/components/listings/mobile-listing-contact-actions';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { CompareButton } from '@/components/compare/compare-button';
import { RelatedGuides } from '@/components/content/blog-card';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { GlobalSearchBar } from '@/components/search/global-search-bar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { ListingDisclaimer, SponsoredDisclaimer } from '@/components/legal/disclaimers';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { getListing, getSimilarListings, searchProjects } from '@/lib/api/marketplace';
import { getAreaHref, getCityBuyHref, getCityRentHref } from '@/lib/routes';
import { formatArea, formatDate, formatPrice } from '@/lib/utils';
import { generateListingMetadata } from '@/lib/seo/seo-templates';
import { listingSchemas } from '@/lib/seo/structured-data';
import { JsonLd } from '@/components/seo/json-ld';

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const listing = await getListing(publicId);
  return generateListingMetadata(listing);
}

export default async function ListingDetailPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [listing, guides] = await Promise.all([getListing(publicId), listLatestBlogPosts(3)]);
  if (!listing) notFound();
  const similarListings = await getSimilarListings(listing.id).catch(() => []);
  const nearbyProjects = await searchProjects({ citySlug: listing.citySlug, areaSlug: listing.areaSlug, limit: 3 }).then((result) => result.items).catch(() => []);
  const displayedSimilarListings = uniqueListings(similarListings).filter((item) => item.id !== listing.id && item.publicId !== listing.publicId).slice(0, 3);
  const isRent = listing.purposeSlug?.toLowerCase().includes('rent');
  const purposeLabel = isRent ? 'Rent' : 'Buy';
  const cityHref = listing.citySlug ? (isRent ? getCityRentHref(listing.citySlug) : getCityBuyHref(listing.citySlug)) : isRent ? '/rent' : '/buy';
  const areaHref = listing.areaSlug ? getAreaHref(listing.areaSlug) : undefined;
  const areaLabel = formatArea(listing.areaValue, listing.areaUnit);
  const galleryImages = listing.images?.length
    ? listing.images
    : listing.coverImageUrl
      ? [{ id: `${listing.id}-cover`, url: listing.coverImageUrl, alt: listing.title, isCover: true, sortOrder: 0 }]
      : [];
  const propertyFacts = [
    listing.bedrooms ? { label: 'Bedrooms', value: String(listing.bedrooms) } : undefined,
    listing.bathrooms ? { label: 'Bathrooms', value: String(listing.bathrooms) } : undefined,
    areaLabel ? { label: 'Area', value: areaLabel } : undefined,
    listing.propertyTypeName ? { label: 'Property type', value: listing.propertyTypeName } : undefined,
    listing.furnishedStatus ? { label: 'Furnishing', value: readable(listing.furnishedStatus) } : undefined,
    listing.possessionStatus ? { label: 'Possession', value: readable(listing.possessionStatus) } : undefined,
    listing.floorNumber !== undefined ? { label: 'Floor', value: listing.totalFloors ? `${listing.floorNumber} of ${listing.totalFloors}` : String(listing.floorNumber) } : undefined,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <>
    <JsonLd data={listingSchemas(listing)} />
    <ViewTracker eventType="listing_viewed" entityType="listing" entityId={listing.id} metadataJson={{ publicId: listing.publicId }} />
    <GlobalSearchBar initialTab={isRent ? 'rent' : 'buy'} compact />
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <div className="hidden sm:block"><Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: purposeLabel, href: isRent ? '/rent' : '/buy' },
        { label: listing.cityName, href: cityHref },
        { label: listing.areaName, href: areaHref },
        { label: listing.publicId },
      ]} /></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="grid gap-5 sm:gap-6">
          <ListingGallery images={galleryImages} title={listing.title} />
          <section>
            <div className="flex flex-wrap gap-2">
              {listing.verificationStatus === 'verified' ? <Badge>Verified</Badge> : null}
              {listing.isFeatured ? <Badge className="bg-amber-50 text-saffron">Featured</Badge> : null}
              <InfoChip>Updated {formatDate(listing.updatedAt)}</InfoChip>
            </div>
            <h1 className="mt-3 text-2xl font-black sm:mt-4 sm:text-3xl">{listing.title}</h1>
            <p className="mt-2 text-2xl font-black text-trust">{formatPrice(listing.priceAmount)}</p>
            <p className="mt-2 text-base text-muted">{areaHref ? <a className="font-semibold text-trust" href={areaHref}>{listing.areaName}</a> : listing.areaName}, <a className="font-semibold text-trust" href={cityHref}>{listing.cityName}</a></p>
            <div className="mt-2"><MobileListingContactActions listingId={listing.id} publicId={listing.publicId} title={listing.title} /></div>
            {areaLabel || listing.propertyTypeName ? <p className="mt-2 text-sm font-semibold text-muted">{[areaLabel, listing.propertyTypeName].filter(Boolean).join(' · ')}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2 sm:mt-4">
              <div className="lg:hidden"><FavoriteButton entityType="listing" entityId={listing.id} /></div>
              <CompareButton type="listing" id={listing.id} />
            </div>
          </section>
          <ListingDisclaimer />
          {propertyFacts.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{propertyFacts.map((fact) => <Card key={fact.label} className="p-3 sm:p-4"><p className="text-sm text-muted">{fact.label}</p><p className="mt-1 text-lg font-black sm:text-xl">{fact.value}</p></Card>)}</div> : null}
          <Card className="p-4 sm:p-5"><h2 className="text-xl font-black">Description</h2><p className="mt-3 whitespace-pre-line break-words leading-7 text-muted">{listing.description}</p></Card>
          <Card className="p-5">
            <h2 className="text-xl font-black">Amenities</h2>
            {listing.amenities?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.amenities.map((amenity, index) => <InfoChip key={amenity.id ?? amenity.code ?? amenity.slug ?? `${amenity.name}-${index}`}>{amenity.name}</InfoChip>)}
              </div>
            ) : <p className="mt-3 text-sm text-muted">No amenities listed yet.</p>}
          </Card>
          <Card className="p-5"><h2 className="text-xl font-black">Location</h2><div className="mt-3 flex h-52 items-center justify-center rounded-lg bg-stone-100 text-sm font-semibold text-muted">Map placeholder for {listing.areaName}</div></Card>
          <Card className="p-4 sm:p-5"><h2 className="text-xl font-black">Listed by</h2>{listing.listerName ? <p className="mt-2 font-bold">{listing.listerName}</p> : null}<p className="mt-1 text-sm text-muted">{listing.listerRole ?? 'Seller information is available in the contact panel.'}</p><p className="mt-3 text-xs text-muted">Listing ID: {listing.publicId}</p><Button className="mt-4" variant="secondary">Report listing</Button></Card>
          <section>
            <h2 className="mb-4 text-xl font-black">Similar properties</h2>
            {displayedSimilarListings.some((item) => item.isFeatured || item.isHot) ? <SponsoredDisclaimer className="mb-4" /> : null}
            {displayedSimilarListings.length ? (
              <div className="grid gap-4 md:grid-cols-3">{displayedSimilarListings.map((item) => <ListingCard key={item.id} listing={item} />)}</div>
            ) : <EmptyState title="No similar listings yet" message="Related properties will appear here as matching inventory is published." />}
          </section>
          <RelatedGuides posts={guides} />
          {nearbyProjects.length ? <section><h2 className="mb-4 text-xl font-black">Projects near {listing.areaName}</h2><div className="grid gap-4 md:grid-cols-3">{nearbyProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div></section> : null}
        </div>
        <ListingActionPanel listing={listing} />
      </div>
    </div>
    </>
  );
}

function uniqueListings(listings: Awaited<ReturnType<typeof getSimilarListings>>) {
  return [...new Map(listings.map((listing) => [listing.id || listing.publicId, listing])).values()];
}

function readable(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
