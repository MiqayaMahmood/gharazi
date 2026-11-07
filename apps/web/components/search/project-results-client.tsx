'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge, InfoChip } from '@/components/ui/badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { Pagination } from '@/components/ui/pagination';
import { Sheet } from '@/components/ui/sheet';
import { defaultFilters, MobileFilterPanel, type FilterValues } from './filter-sidebar';
import { GlobalSearchBar, filterQuery, isUuid } from './global-search-bar';
import { useProjects } from '@/lib/query/hooks';
import { ProjectCard } from '@/components/projects/project-card';
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
import { ProjectLandingRecommendations } from '@/components/search/search-landing-client-sections';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';

const defaultLimit = 20;

export function ProjectResultsClient() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const page = positiveInt(searchParams.get('page'), 1);
  const limit = positiveInt(searchParams.get('limit'), defaultLimit);
  const [filters, setFilters] = useState<FilterValues>(() => projectFiltersFromParams(searchParams));
  const router = useRouter();
  const queryClient = useQueryClient();
  const [applied, setApplied] = useState(filters);
  const [view, setView] = useState<'list' | 'map'>('list');
  const { mobileFiltersOpen, setMobileFiltersOpen } = useUiStore();
  const params = useMemo(() => {
    const projectTypeValue = applied.propertyTypeId;
    const projectTypeIsId = projectTypeValue ? isUuid(projectTypeValue) : false;
    return {
    q: applied.q || applied.location,
    cityId: applied.cityId || undefined,
    projectTypeId: projectTypeIsId ? projectTypeValue : undefined,
    projectTypeCode: projectTypeValue && !projectTypeIsId ? projectTypeValue : undefined,
    possessionStatus: applied.possessionStatus || undefined,
    legalStatus: applied.legalStatus || undefined,
    minPrice: Number(applied.minPrice) || undefined,
    maxPrice: Number(applied.maxPrice) || undefined,
    sort: applied.sort,
    page,
    limit,
    };
  }, [applied, limit, page]);
  const context = useMemo(() => ({
    purpose: 'project' as const,
    propertyTypeCode: applied.propertyTypeId && !isUuid(applied.propertyTypeId) ? applied.propertyTypeId : undefined,
    propertyTypeName: applied.propertyTypeId && !isUuid(applied.propertyTypeId) ? readable(applied.propertyTypeId) : undefined,
    category: 'project' as const,
  }), [applied.propertyTypeId]);
  const query = useProjects(params);
  const saveMutation = useMutation({
    mutationFn: () => createSavedSearch({ name: 'Project search', filtersJson: params, alertEnabled: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      router.push('/dashboard/saved-searches');
    },
    onError: () => router.push('/login?next=/projects'),
  });
  const active = Object.entries(applied).filter(([, value]) => Boolean(value) && value !== 'relevant');

  useEffect(() => {
    const next = projectFiltersFromParams(new URLSearchParams(searchParamsKey));
    setFilters(next);
    setApplied(next);
  }, [searchParamsKey]);

  function apply(nextFilters = filters) {
    setApplied(nextFilters);
    pushQuery(nextFilters, 1, limit);
  }

  function clear() {
    setFilters(defaultFilters);
    setApplied(defaultFilters);
    pushQuery(defaultFilters, 1, limit);
  }

  function pushQuery(nextFilters: FilterValues, nextPage: number, nextLimit: number) {
    const params = new URLSearchParams(filterQuery(nextFilters, true));
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextLimit !== defaultLimit) params.set('limit', String(nextLimit));
    const queryString = params.toString();
    router.push(`/projects${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }

  function changePage(nextPage: number) {
    pushQuery(applied, nextPage, limit);
  }

  function changeLimit(nextLimit: number) {
    pushQuery(applied, 1, nextLimit);
  }

  return (
    <>
      <GlobalSearchBar activeFilterCount={active.length} mode="controlled" initialTab="projects" values={filters} onChange={setFilters} onSearch={() => apply()} onOpenFilters={() => setMobileFiltersOpen(true)} />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6">
      <div className="hidden sm:block"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Projects' }]} /></div>
      <div className="mb-5 hidden gap-3 xl:grid">
        <SearchLandingIntro context={context} />
        <QuickSearchChips context={context} />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div>
          <Badge className="bg-sky-50 text-sky">New projects</Badge>
          <h1 className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl">New Projects in Pakistan</h1>
          <p className="mt-1 text-muted">{query.data ? resultSummary(query.data.total, page, limit, 'projects') : 'Compare developers, payment plans, possession status, and legal signals.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMutation.mutate()} variant="secondary">Save search</Button>
          <Button onClick={() => setView((current) => (current === 'list' ? 'map' : 'list'))} variant="secondary">{view === 'list' ? 'Map view' : 'List view'}</Button>
          {active.length ? <Button onClick={clear} variant="ghost">Clear filters</Button> : null}
        </div>
      </div>
      <div className="mb-4 flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {active.map(([key, value]) => <InfoChip key={key}>{key}: {String(value)}</InfoChip>)}
      </div>
      <section>
          {query.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80" />)}</div> : null}
          {query.isError ? <ErrorState title="Project search failed" message="Try adjusting filters or reload the page." /> : null}
          {query.data && query.data.items.length === 0 ? <EmptyState title="No projects found" message="Try a broader city, clear legal/possession filters, or save this search for future project alerts." /> : null}
          {query.data && view === 'map' ? (
            <MapPreview
              title="Projects map preview"
              items={query.data.items.map((project) => ({
                id: project.id,
                title: project.name,
                areaName: project.areaName,
                cityName: project.cityName,
                priceLabel: `${formatPrice(project.minPriceAmount)} onward`,
              }))}
            />
          ) : null}
          {query.data && view === 'list' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.items.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : null}
          <div className="mt-8">{query.data ? <Pagination page={page} total={query.data.total} pageSize={limit} onPageChange={changePage} onPageSizeChange={changeLimit} /> : null}</div>
      </section>
      <div className="mt-8 grid gap-3 xl:hidden">
        <SearchLandingIntro context={context} />
        <QuickSearchChips context={context} />
      </div>
      <ProjectLandingRecommendations context={context} />
      <SuggestedAreasSection context={context} />
      <ContextualToolsSection context={context} />
      <PremiumProfilesSection context={context} />
      <SearchLandingFaq context={context} />
      <Sheet open={mobileFiltersOpen} title="Project filters" onClose={() => setMobileFiltersOpen(false)}>
        <MobileFilterPanel projectMode values={filters} onChange={setFilters} />
        <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-2 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] pt-3">
          <Button onClick={clear} variant="secondary">Clear</Button>
          <Button onClick={() => { apply(); setMobileFiltersOpen(false); }}>Apply filters</Button>
        </div>
      </Sheet>
    </div>
    </>
  );
}

function projectFiltersFromParams(params: Pick<URLSearchParams, 'get'>): FilterValues {
  return {
    ...defaultFilters,
    q: params.get('q') ?? '',
    cityId: params.get('cityId') ?? '',
    location: params.get('location') ?? '',
    propertyTypeId: params.get('projectTypeId') ?? params.get('projectTypeCode') ?? params.get('propertyTypeId') ?? params.get('propertyTypeCode') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    minArea: params.get('minArea') ?? '',
    maxArea: params.get('maxArea') ?? '',
    bedrooms: params.get('bedrooms') ?? '',
    bathrooms: params.get('bathrooms') ?? '',
    furnishedStatus: params.get('furnishedStatus') ?? '',
    possessionStatus: params.get('possessionStatus') ?? '',
    legalStatus: params.get('legalStatus') ?? '',
    floor: params.get('floor') ?? '',
    corner: params.get('corner') === 'true',
    parking: params.get('parking') === 'true',
    verifiedOnly: params.get('verifiedOnly') === 'true',
    sort: params.get('sort') ?? 'relevant',
  };
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
