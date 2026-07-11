import { HeroSearch } from '@/components/search/hero-search';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/listings/listing-card';
import { ProjectCard } from '@/components/projects/project-card';
import { EmptyState } from '@/components/ui/state';
import { RelatedGuides } from '@/components/content/blog-card';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { searchListings, searchProjects } from '@/lib/api/marketplace';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { AreaDiscovery, FeaturedAgencies, PopularQuickSearches, QuickCategories, SmartTools, TrustStrip, WhyChooseUs } from '@/components/home/home-sections';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import { HeroAdSlot, InlineAdSlot } from '@/components/ads/ad-slot';
import { SponsoredDisclaimer } from '@/components/legal/disclaimers';
import { generateHomeMetadata } from '@/lib/seo/seo-templates';
import { homeSchemas } from '@/lib/seo/structured-data';
import { JsonLd } from '@/components/seo/json-ld';

export const metadata = generateHomeMetadata();

export default async function HomePage() {
  const [guides, listings, projects] = await Promise.all([
    listLatestBlogPosts(3),
    searchListings({ sort: 'newest', limit: 3 }).then((response) => response.items).catch((error) => {
      if (process.env.NODE_ENV === 'development') console.warn('Homepage listings failed to load from API', error);
      return [];
    }),
    searchProjects({ sort: 'newest', limit: 3 }).then((response) => response.items).catch((error) => {
      if (process.env.NODE_ENV === 'development') console.warn('Homepage projects failed to load from API', error);
      return [];
    }),
  ]);
  return (
    <>
      <JsonLd data={homeSchemas()} />
      <section className="border-b border-line bg-[linear-gradient(180deg,#f4f8f4_0%,#fbfbf7_100%)]">
        <HeroSearch />
        <HeroCarousel fullWidth />
        <div className="mx-auto max-w-7xl px-4 py-5">
          <HeroAdSlot />
        </div>
      </section>

      <TrustStrip />
      <QuickCategories />
      <FeaturedAgencies />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Featured listings</h2>
            <p className="text-muted">Fresh public inventory from the live marketplace.</p>
          </div>
          <Button href="/buy" asChild variant="secondary">Browse all</Button>
        </div>
        <SponsoredDisclaimer className="mb-4" />
        {listings.length ? (
          <div className="grid gap-4 md:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
        ) : (
          <EmptyState title="No featured listings yet" message="Published listings will appear here once they are available." />
        )}
      </section>

      <div className="mx-auto max-w-7xl px-4 py-4">
        <InlineAdSlot />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">New and featured projects</h2>
            <p className="text-muted">Payment plan, possession, legal status, and developer identity stay visible.</p>
          </div>
          <Button href="/projects" asChild variant="secondary">Explore projects</Button>
        </div>
        {projects.length ? (
          <div className="grid gap-4 lg:grid-cols-3">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
        ) : (
          <EmptyState title="No featured projects yet" message="Published projects will appear here once they are available." />
        )}
      </section>

      <AreaDiscovery />
      <PopularQuickSearches />
      <SmartTools />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <RelatedGuides posts={guides} />
      </div>
      <WhyChooseUs />

      <section className="mx-auto max-w-7xl px-4 py-10" id="feedback">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-black">Beta feedback shapes the product</h2>
            <p className="mt-2 text-muted">Early users can report issues, suggest improvements, and tell us what helps them move from search to inquiry with confidence.</p>
          </div>
          <FeedbackForm compact />
        </div>
      </section>
    </>
  );
}
