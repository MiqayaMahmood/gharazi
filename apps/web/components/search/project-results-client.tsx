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

export function ProjectResultsClient() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterValues>({
    ...defaultFilters,
    q: searchParams.get('q') ?? '',
    cityId: searchParams.get('cityId') ?? '',
    location: searchParams.get('location') ?? '',
    propertyTypeId: searchParams.get('projectTypeId') ?? searchParams.get('projectTypeCode') ?? searchParams.get('propertyTypeId') ?? searchParams.get('propertyTypeCode') ?? '',
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
    page: 1,
    };
  }, [applied]);
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

  function apply(nextFilters = filters) {
    setApplied(nextFilters);
    const queryString = filterQuery(nextFilters, true);
    router.replace(`/projects${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }

  function clear() {
    setFilters(defaultFilters);
    apply(defaultFilters);
  }

  return (
    <>
      <GlobalSearchBar mode="controlled" initialTab="projects" values={filters} onChange={setFilters} onSearch={() => apply()} />
      <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 grid gap-3">
        <SearchLandingIntro context={context} />
        <QuickSearchChips context={context} />
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge className="bg-sky-50 text-sky">New projects</Badge>
          <h1 className="mt-3 text-3xl font-black">Transparent project discovery</h1>
          <p className="mt-1 text-muted">Compare developers, payment plans, possession status, and legal signals.</p>
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
          <div className="mt-8">{query.data ? <Pagination page={1} total={query.data.total} /> : null}</div>
      </section>
      <ProjectLandingRecommendations context={context} />
      <SuggestedAreasSection context={context} />
      <ContextualToolsSection context={context} />
      <PremiumProfilesSection context={context} />
      <SearchLandingFaq context={context} />
      <Sheet open={mobileFiltersOpen} title="Project filters" onClose={() => setMobileFiltersOpen(false)}>
        <DynamicAdvancedFilters projectMode values={filters} onChange={setFilters} />
        <Button className="mt-4 w-full" onClick={() => { apply(); setMobileFiltersOpen(false); }}>Apply filters</Button>
      </Sheet>
    </div>
    </>
  );
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
