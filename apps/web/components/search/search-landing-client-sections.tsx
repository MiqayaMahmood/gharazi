'use client';

import { RecommendedListingsSection, RecommendedProjectsSection } from '@/components/search/search-landing-content';
import { Skeleton } from '@/components/ui/state';
import { useListings, usePopularListings, usePopularProjects, useProjects } from '@/lib/query/hooks';
import type { SearchLandingContext } from '@/lib/search/search-context';

export function ListingLandingRecommendations({ context }: { context: SearchLandingContext }) {
  const listings = useListings({
    purposeSlug: context.purpose === 'rent' ? 'rent' : 'sale',
    propertyTypeCode: context.propertyTypeCode,
    citySlug: context.citySlug,
    sort: 'newest',
    limit: 3,
  });
  const projects = useProjects({ citySlug: context.citySlug, sort: 'newest', limit: 3 });
  const popularListings = usePopularListings({ purpose: context.purpose === 'rent' ? 'rent' : 'sale', limit: 3 });
  return (
    <>
      {listings.isLoading ? <Skeleton className="mt-10 h-80" /> : null}
      {popularListings.data?.items.length ? <RecommendedListingsSection title={context.purpose === 'rent' ? 'Most viewed rentals' : 'Most viewed properties'} listings={popularListings.data.items} /> : null}
      {listings.data ? <RecommendedListingsSection title={context.purpose === 'rent' ? 'Recently added rentals' : 'Recently added properties'} listings={listings.data.items} /> : null}
      {projects.data?.items.length ? <RecommendedProjectsSection title="New projects nearby" projects={projects.data.items} /> : null}
    </>
  );
}

export function ProjectLandingRecommendations({ context }: { context: SearchLandingContext }) {
  const projects = useProjects({ citySlug: context.citySlug, sort: 'newest', limit: 3 });
  const popularProjects = usePopularProjects({ limit: 3 });
  return (
    <>
      {projects.isLoading ? <Skeleton className="mt-10 h-80" /> : null}
      {popularProjects.data?.items.length ? <RecommendedProjectsSection title="Popular projects by views" projects={popularProjects.data.items} /> : null}
      {projects.data ? <RecommendedProjectsSection title="Recommended projects" projects={projects.data.items} /> : null}
    </>
  );
}
