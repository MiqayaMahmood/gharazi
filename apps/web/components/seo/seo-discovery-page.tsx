import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { mockAreas, mockPropertyTypes } from '@/lib/mock-data';
import type { BlogPost } from '@/types/cms';
import { searchListings, searchProjects } from '@/lib/api/marketplace';
import {
  ContextualGuidesSection,
  ContextualToolsSection,
  PremiumProfilesSection,
  QuickSearchChips,
  RecommendedListingsSection,
  RecommendedProjectsSection,
  SearchLandingFaq,
  SearchLandingIntro,
  SuggestedAreasSection,
} from '@/components/search/search-landing-content';
import { categoryForPropertyType, type SearchLandingContext } from '@/lib/search/search-context';

export async function SeoDiscoveryPage({
  title,
  description,
  purpose,
  city,
  citySlug,
  propertyType,
  propertyTypeCode,
  guides = [],
}: {
  title: string;
  description: string;
  purpose?: 'buy' | 'rent';
  city?: string;
  citySlug?: string;
  propertyType?: string;
  propertyTypeCode?: string;
  guides?: BlogPost[];
}) {
  const context: SearchLandingContext = {
    purpose: purpose === 'rent' ? 'rent' : purpose === 'buy' ? 'sale' : 'project',
    cityName: city,
    citySlug,
    propertyTypeName: propertyType,
    propertyTypeCode,
    category: purpose ? categoryForPropertyType(propertyTypeCode) : 'project',
  };
  const [listings, projects] = await Promise.all([
    purpose ? searchListings({
      purposeCode: purpose === 'rent' ? 'rent' : 'sale',
      citySlug,
      propertyTypeCode,
      sort: 'newest',
      limit: 3,
    }).then((response) => response.items).catch(() => []) : Promise.resolve([]),
    searchProjects({ citySlug, sort: 'newest', limit: 3 }).then((response) => response.items).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="flex flex-wrap gap-2">
            {purpose ? <Badge>{purpose === 'buy' ? 'Buy' : 'Rent'}</Badge> : null}
            {city ? <InfoChip>{city}</InfoChip> : null}
            {propertyType ? <InfoChip>{propertyType}</InfoChip> : null}
          </div>
          <h1 className="mt-4 text-4xl font-black">{title}</h1>
          <p className="mt-3 max-w-3xl text-lg text-muted">{description}</p>
          <div className="mt-5">
            <QuickSearchChips context={context} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={`/${purpose ?? 'projects'}${citySlug ? `?citySlug=${citySlug}` : ''}`} asChild>Open live search</Button>
            <Button href="/projects" asChild variant="secondary">Explore projects</Button>
          </div>
        </section>
        <Card className="p-5">
          <h2 className="text-lg font-black">Related searches</h2>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-trust">
            {mockPropertyTypes.slice(0, 4).map((type) => <Link key={type.id} href={`/buy/${type.code}/${city?.toLowerCase() ?? 'lahore'}`}>{type.name} in {city ?? 'Lahore'}</Link>)}
            {mockAreas.slice(0, 3).map((area) => <Link key={area.id} href={`/area/${area.slug}`}>{area.name}, {area.cityName}</Link>)}
          </div>
        </Card>
      </div>

      <div className="mt-8"><SearchLandingIntro context={context} /></div>
      {purpose ? <RecommendedListingsSection title="Recently added properties" listings={listings} /> : null}
      {!purpose && !projects.length ? <div className="mt-10"><EmptyState title="No projects found yet" message="Published projects will appear here once available." /></div> : null}
      <RecommendedProjectsSection title={purpose ? 'New projects nearby' : 'Recommended projects'} projects={projects} />

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {['Verified inventory', 'Fresh updates', 'Direct inquiries'].map((item) => (
          <Card key={item} className="p-5">
            <h3 className="font-black">{item}</h3>
            <p className="mt-2 text-sm text-muted">Trust and communication cues remain visible from search through detail pages.</p>
          </Card>
        ))}
      </section>
      <SuggestedAreasSection context={context} />
      <ContextualToolsSection context={context} />
      <PremiumProfilesSection context={context} />
      <ContextualGuidesSection posts={guides} />
      <SearchLandingFaq context={context} />
    </div>
  );
}
