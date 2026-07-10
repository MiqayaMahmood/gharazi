'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge, InfoChip } from '@/components/ui/badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { Pagination } from '@/components/ui/pagination';
import { Sheet } from '@/components/ui/sheet';
import { defaultFilters, DynamicAdvancedFilters, type FilterValues } from './filter-sidebar';
import { GlobalSearchBar, filterQuery, isUuid } from './global-search-bar';
import { useListings } from '@/lib/query/hooks';
import { ListingCard } from '@/components/listings/listing-card';
import { useUiStore } from '@/stores/ui-store';
import { createSavedSearch } from '@/lib/api/engagement';
import { MapPreview } from '@/components/map/map-preview';
import { formatPrice } from '@/lib/utils';
import {
  ContextualToolsSection,
  PremiumProfilesSection,
  QuickSearchChips,
  SearchLandingFaq,
  SearchLandingIntro,
  SuggestedAreasSection,
} from '@/components/search/search-landing-content';
import { ListingLandingRecommendations } from '@/components/search/search-landing-client-sections';
import { categoryForPropertyType } from '@/lib/search/search-context';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';

const defaultLimit = 20;

export function ListingSearchClient({ purpose }: { purpose: 'buy' | 'rent' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const page = positiveInt(searchParams.get('page'), 1);
  const limit = positiveInt(searchParams.get('limit'), defaultLimit);
  const [filters, setFilters] = useState<FilterValues>({
    ...defaultFilters,
    q: searchParams.get('q') ?? '',
    cityId: searchParams.get('cityId') ?? '',
    location: searchParams.get('location') ?? '',
    propertyTypeId: searchParams.get('propertyTypeId') ?? searchParams.get('propertyTypeCode') ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    minArea: searchParams.get('minArea') ?? '',
    maxArea: searchParams.get('maxArea') ?? '',
    bedrooms: searchParams.get('bedrooms') ?? '',
    bathrooms: searchParams.get('bathrooms') ?? '',
    furnishedStatus: searchParams.get('furnishedStatus') ?? '',
    possessionStatus: searchParams.get('possessionStatus') ?? '',
    legalStatus: searchParams.get('legalStatus') ?? '',
    floor: searchParams.get('floor') ?? '',
    corner: searchParams.get('corner') === 'true',
    parking: searchParams.get('parking') === 'true',
    sort: searchParams.get('sort') ?? 'relevant',
  });
  const [applied, setApplied] = useState(filters);
  const [view, setView] = useState<'list' | 'map'>('list');
  const { mobileFiltersOpen, setMobileFiltersOpen } = useUiStore();
  const params = useMemo(() => {
    const propertyTypeValue = applied.propertyTypeId;
    const propertyTypeIsId = propertyTypeValue ? isUuid(propertyTypeValue) : false;
    return {
    purposeSlug: purpose === 'buy' ? 'sale' : purpose,
    q: applied.q || applied.location,
    cityId: applied.cityId || undefined,
    propertyTypeId: propertyTypeIsId ? propertyTypeValue : undefined,
    propertyTypeCode: propertyTypeValue && !propertyTypeIsId ? propertyTypeValue : undefined,
    minPrice: Number(applied.minPrice) || undefined,
    maxPrice: Number(applied.maxPrice) || undefined,
    minArea: Number(applied.minArea) || undefined,
    maxArea: Number(applied.maxArea) || undefined,
    bedrooms: Number(applied.bedrooms) || undefined,
    bathrooms: Number(applied.bathrooms) || undefined,
    furnishedStatus: applied.furnishedStatus || undefined,
    verifiedOnly: applied.verifiedOnly,
    sort: applied.sort,
    page,
    limit,
    };
  }, [applied, limit, page, purpose]);
  const context = useMemo(() => ({
    purpose: purpose === 'rent' ? 'rent' as const : 'sale' as const,
    propertyTypeCode: applied.propertyTypeId && !isUuid(applied.propertyTypeId) ? applied.propertyTypeId : undefined,
    propertyTypeName: applied.propertyTypeId && !isUuid(applied.propertyTypeId) ? readable(applied.propertyTypeId) : undefined,
    category: categoryForPropertyType(applied.propertyTypeId && !isUuid(applied.propertyTypeId) ? applied.propertyTypeId : undefined),
  }), [applied.propertyTypeId, purpose]);
  const query = useListings(params);
  const saveMutation = useMutation({
    mutationFn: () => createSavedSearch({ name: `${purpose === 'buy' ? 'Buy' : 'Rent'} search`, filtersJson: params, alertEnabled: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      router.push('/dashboard/saved-searches');
    },
    onError: () => router.push(`/login?next=${encodeURIComponent(`/${purpose}`)}`),
  });
  const active = Object.entries(applied).filter(([, value]) => Boolean(value) && value !== 'relevant');
  const resultTitle = context.propertyTypeName
    ? `${context.propertyTypeName} for ${purpose === 'rent' ? 'Rent' : 'Sale'}`
    : purpose === 'rent' ? 'Properties for Rent' : 'Properties for Sale';

  function apply(nextFilters = filters) {
    setApplied(nextFilters);
    replaceQuery(nextFilters, 1, limit);
  }

  function clear() {
    setFilters(defaultFilters);
    setApplied(defaultFilters);
    replaceQuery(defaultFilters, 1, limit);
  }

  function replaceQuery(nextFilters: FilterValues, nextPage: number, nextLimit: number) {
    const params = new URLSearchParams(filterQuery(nextFilters));
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextLimit !== defaultLimit) params.set('limit', String(nextLimit));
    const queryString = params.toString();
    router.replace(`/${purpose}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }

  function changePage(nextPage: number) {
    replaceQuery(applied, nextPage, limit);
  }

  function changeLimit(nextLimit: number) {
    replaceQuery(applied, 1, nextLimit);
  }

  return (
    <>
      <GlobalSearchBar mode="controlled" initialTab={purpose} values={filters} onChange={setFilters} onSearch={() => apply()} />
      <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: purpose === 'buy' ? 'Buy' : 'Rent' }]} />
      <div className="mb-5 grid gap-3">
        <SearchLandingIntro context={context} />
        <QuickSearchChips context={context} />
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>{purpose === 'buy' ? 'Buy' : 'Rent'}</Badge>
          <h1 className="mt-3 text-3xl font-black">{resultTitle} in Pakistan</h1>
          <p className="mt-1 text-muted">{query.data ? resultSummary(query.data.total, page, limit, 'properties') : 'Verified inventory, fresh updates, and direct inquiry readiness.'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate()} variant="secondary">Save search</Button>
          <Button onClick={() => setView((current) => (current === 'list' ? 'map' : 'list'))} variant="secondary">{view === 'list' ? 'Map view' : 'List view'}</Button>
          {active.length ? <Button onClick={clear} variant="ghost">Clear filters</Button> : null}
          <Button className="md:hidden" onClick={() => setMobileFiltersOpen(true)} variant="secondary">More filters</Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {active.map(([key, value]) => <InfoChip key={key}>{key}: {String(value)}</InfoChip>)}
      </div>
      <section>
          {query.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-80" />)}</div> : null}
          {query.isError ? <ErrorState title="Search failed" message="Try adjusting filters or reload the page." /> : null}
          {query.data && query.data.items.length === 0 ? <EmptyState title={`No listings found for ${resultTitle}`} message="Try clearing filters, broadening the area, or saving this search for future alerts." /> : null}
          {query.data && view === 'map' ? (
            <MapPreview
              title="Listings map preview"
              items={query.data.items.map((listing) => ({
                id: listing.id,
                title: listing.title,
                areaName: listing.areaName,
                cityName: listing.cityName,
                priceLabel: formatPrice(listing.priceAmount),
              }))}
            />
          ) : null}
          {query.data && view === 'list' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {query.data.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
            </div>
          ) : null}
          <div className="mt-8">{query.data ? <Pagination page={page} total={query.data.total} pageSize={limit} onPageChange={changePage} onPageSizeChange={changeLimit} /> : null}</div>
      </section>
      <ListingLandingRecommendations context={context} />
      <SuggestedAreasSection context={context} />
      <ContextualToolsSection context={context} />
      <PremiumProfilesSection context={context} />
      <SearchLandingFaq context={context} />
      <Sheet open={mobileFiltersOpen} title="Filters" onClose={() => setMobileFiltersOpen(false)}>
        <DynamicAdvancedFilters values={filters} onChange={setFilters} />
        <Button className="mt-4 w-full" onClick={() => { apply(); setMobileFiltersOpen(false); }}>Apply filters</Button>
      </Sheet>
    </div>
    </>
  );
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resultSummary(total: number, page: number, limit: number, label: string) {
  if (!total) return `No ${label} found for this search.`;
  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return `Showing ${start}-${end} of ${total} ${label}. Page ${Math.min(page, totalPages)} of ${totalPages}.`;
}
