import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import type { BlogPost } from '@/types/cms';
import { autocompleteAreas, searchListings, searchProjects } from '@/lib/api/marketplace';
import { getAreaHref, getBuyPropertyTypeCityHref, getCityBuyHref, getCityRentHref, getProjectsCityHref } from '@/lib/routes';
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
import { listPropertyTypes } from '@/lib/api/reference';
import { JsonLd } from '@/components/seo/json-ld';
import { faqSchema } from '@/lib/seo/structured-data';

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
  const [listings, projects, propertyTypes, relatedAreas] = await Promise.all([
    purpose ? searchListings({
      purposeSlug: purpose === 'rent' ? 'rent' : 'sale',
      citySlug,
      propertyTypeCode,
      sort: 'newest',
      limit: 3,
    }).then((response) => response.items).catch(() => []) : Promise.resolve([]),
    searchProjects({ citySlug, sort: 'newest', limit: 3 }).then((response) => response.items).catch(() => []),
    listPropertyTypes().catch(() => []),
    autocompleteAreas(city ?? '').catch(() => []),
  ]);
  const primaryHref = purpose === 'rent' ? '/rent' : purpose === 'buy' ? '/buy' : '/projects';
  const cityHref = citySlug ? (purpose === 'rent' ? getCityRentHref(citySlug) : purpose === 'buy' ? getCityBuyHref(citySlug) : getProjectsCityHref(citySlug)) : undefined;
  const faqItems: Array<[string, string]> = [
    [`How can I find ${purpose === 'rent' ? 'rental' : purpose === 'buy' ? 'sale' : 'project'} options${city ? ` in ${city}` : ''}?`, 'Use the live search filters, review freshness and verification signals, and contact the owner, agent, or developer through the listing or project page.'],
    [`What should I verify before committing${city ? ` to property in ${city}` : ''}?`, 'Confirm ownership or developer identity, legal and approval documents, exact location, property condition, price terms, and payment requests independently.'],
    ['Does Gharazi publish average market prices?', 'Gharazi does not invent market statistics. Prices shown come from currently available listings and projects; verify final terms directly before making a decision.'],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={faqSchema(faqItems)} />
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: purpose === 'rent' ? 'Rent' : purpose === 'buy' ? 'Buy' : 'Projects', href: primaryHref },
        ...(city ? [{ label: city, href: cityHref }] : []),
        ...(propertyType ? [{ label: propertyType }] : []),
      ]} />
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
            <Button href={cityHref ?? primaryHref} asChild>Open live search</Button>
            <Button href="/projects" asChild variant="secondary">Explore projects</Button>
          </div>
        </section>
        <Card className="p-5">
          <h2 className="text-lg font-black">Related searches</h2>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-trust">
            {propertyTypes.slice(0, 4).flatMap((type) => {
              if (!type.code) return [];
              return <Link key={type.id} href={getBuyPropertyTypeCityHref(type.code, citySlug ?? 'lahore')}>{type.name} in {city ?? 'Lahore'}</Link>;
            })}
            {relatedAreas.slice(0, 3).flatMap((area) => {
              if (!area.slug) return [];
              return <Link key={area.id} href={getAreaHref(area.slug)}>{area.name}{area.cityName ? `, ${area.cityName}` : ''}</Link>;
            })}
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
