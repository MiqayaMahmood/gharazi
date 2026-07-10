import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { ListingCard } from '@/components/listings/listing-card';
import { ProjectCard } from '@/components/projects/project-card';
import { RelatedGuides } from '@/components/content/blog-card';
import type { BlogPost } from '@/types/cms';
import type { Listing, Project } from '@/types/marketplace';
import type { SearchLandingContext } from '@/lib/search/search-context';
import { searchLandingSubtitle, searchLandingTitle } from '@/lib/search/search-context';
import { getAreaHref, getCityBuyHref, getCityRentHref, getProjectsCityHref } from '@/lib/routes';

export function SearchLandingIntro({ context }: { context: SearchLandingContext }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="flex flex-wrap gap-2">
        <Badge>{context.purpose === 'project' ? 'Projects' : context.purpose === 'rent' ? 'Rent' : 'Buy'}</Badge>
        {context.cityName ? <InfoChip>{context.cityName}</InfoChip> : null}
        {context.propertyTypeName ? <InfoChip>{context.propertyTypeName}</InfoChip> : null}
      </div>
      <h1 className="mt-3 text-3xl font-black">{searchLandingTitle(context)}</h1>
      <p className="mt-2 max-w-4xl text-muted">{searchLandingSubtitle(context)}</p>
    </section>
  );
}

export function QuickSearchChips({ context }: { context: SearchLandingContext }) {
  const chips = context.purpose === 'project'
    ? [
      ['Ready for possession', '/projects?possessionStatus=ready'],
      ['Installment plans', '/projects?q=installment'],
      ['Lahore projects', getProjectsCityHref('lahore')],
      ['Karachi projects', getProjectsCityHref('karachi')],
      ['Compare projects', '/compare/projects'],
    ]
    : context.purpose === 'rent'
      ? [
        ['Houses for rent', '/rent?propertyTypeCode=house'],
        ['Apartments for rent', '/rent?propertyTypeCode=apartment'],
        ['Offices for rent', '/rent?propertyTypeCode=office'],
        ['Furnished', '/rent?furnishedStatus=furnished'],
        ['Save searches', '/dashboard/saved-searches'],
      ]
      : [
        ['Houses', '/buy?propertyTypeCode=house'],
        ['Apartments', '/buy?propertyTypeCode=apartment'],
        ['Plots', '/buy?propertyTypeCode=plot'],
        ['Commercial', '/buy?propertyTypeCode=commercial'],
        ['Verified only', '/buy?verifiedOnly=true'],
      ];
  return (
    <section className="flex flex-wrap gap-2">
      {chips.map(([label, href]) => <Link key={label} href={href}><InfoChip>{label}</InfoChip></Link>)}
    </section>
  );
}

export function RecommendedListingsSection({ title, listings }: { title: string; listings: Listing[] }) {
  if (!listings.length) return <EmptyState title="No recommended properties yet" message="Published inventory will appear here as the marketplace grows." />;
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge>Recommended</Badge>
          <h2 className="mt-2 text-2xl font-black">{title}</h2>
        </div>
        <Link className="text-sm font-bold text-trust" href="/buy">Browse all properties</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
    </section>
  );
}

export function RecommendedProjectsSection({ title, projects }: { title: string; projects: Project[] }) {
  if (!projects.length) return <EmptyState title="No recommended projects yet" message="Published projects will appear here once available." />;
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge className="bg-sky-50 text-sky">Project discovery</Badge>
          <h2 className="mt-2 text-2xl font-black">{title}</h2>
        </div>
        <Link className="text-sm font-bold text-trust" href="/projects">Explore projects</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
    </section>
  );
}

export function SuggestedAreasSection({ context }: { context: SearchLandingContext }) {
  const city = context.citySlug ?? 'lahore';
  const links = [
    ['DHA Phase 6 Lahore', getAreaHref('dha-phase-6-lahore')],
    ['Clifton Karachi', getAreaHref('clifton-karachi')],
    ['Gulberg Lahore', getAreaHref('gulberg-lahore')],
    ['Islamabad projects', getProjectsCityHref('islamabad')],
  ];
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black">Popular locations and related searches</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {links.map(([label, href]) => <Link key={label} href={href}><Card className="p-4 font-bold transition hover:border-trust">{label}</Card></Link>)}
        <Link href={context.purpose === 'project' ? getProjectsCityHref(city) : context.purpose === 'rent' ? getCityRentHref(city) : getCityBuyHref(city)}><Card className="p-4 font-bold transition hover:border-trust">More in {context.cityName ?? 'Lahore'}</Card></Link>
      </div>
    </section>
  );
}

export function ContextualToolsSection({ context }: { context: SearchLandingContext }) {
  const tools = context.purpose === 'project'
    ? [['Compare Projects', '/compare/projects', 'Live'], ['Payment Plan Guide', '/blog', 'Guide'], ['Project Investment Checklist', '/blog', 'Guide'], ['Area Insights', '/area/dha-phase-6-lahore', 'Live']]
    : context.category === 'plot' || context.category === 'commercial'
      ? [['Compare Properties', '/compare/listings', 'Live'], ['Area Unit Converter', '', 'Coming soon'], ['Price Trends', '', 'Coming soon'], ['Commercial Investment Guide', '/blog', 'Guide']]
      : context.purpose === 'rent'
        ? [['Compare Rentals', '/compare/listings', 'Live'], ['Rent vs Buy Guide', '/blog', 'Guide'], ['Area Guides', '/area/dha-phase-6-lahore', 'Live'], ['Moving Checklist', '', 'Coming soon']]
        : [['Compare Properties', '/compare/listings', 'Live'], ['Area Guides', '/area/dha-phase-6-lahore', 'Live'], ['Home Loan Calculator', '', 'Coming soon'], ['Price Trends', '', 'Coming soon']];
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black">Helpful tools for this search</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map(([label, href, status]) => {
          const card = <Card className="h-full p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-black">{label}</h3><Badge className={status === 'Coming soon' ? 'bg-stone-100 text-muted' : ''}>{status}</Badge></div></Card>;
          return href ? <Link key={label} href={href}>{card}</Link> : <div key={label}>{card}</div>;
        })}
      </div>
    </section>
  );
}

export function PremiumProfilesSection({ context }: { context: SearchLandingContext }) {
  return (
    <section className="mt-10">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge className="bg-amber-50 text-saffron">Premium profiles</Badge>
            <h2 className="mt-2 text-2xl font-black">{context.purpose === 'project' ? 'Featured developers' : 'Verified agencies'}</h2>
            <p className="mt-2 text-sm text-muted">A real premium profile feed is planned. Until then, this section stays informational and does not show fake agencies or developers.</p>
          </div>
                  <Link className="text-sm font-bold text-trust" href="/advertise">Advertise with Gharazi</Link>
        </div>
      </Card>
    </section>
  );
}

export function SearchLandingFaq({ context }: { context: SearchLandingContext }) {
  const items = context.purpose === 'project'
    ? [['How do I verify a developer project?', 'Check legal status, possession timeline, developer profile, payment plan details, and supporting documents before committing.'], ['What is possession status?', 'It indicates whether units are ready, under construction, or still planned. Always verify directly with the developer or relevant authority.'], ['Can I compare projects?', 'Yes, use Compare Projects to review price ranges, possession, amenities, and trust signals side by side.']]
    : context.purpose === 'rent'
      ? [['How do I contact a landlord or agent?', 'Open a listing and use the inquiry panel to send a guided message or start a chat after login.'], ['What should I check before renting?', 'Verify identity, rent terms, maintenance responsibilities, deposits, and property condition before payment.'], ['Can I save rental searches?', 'Yes, logged-in users can save searches and manage alerts from the dashboard.']]
          : [['How do I verify a property before buying?', 'Check ownership documents, approvals, location, seller identity, dues, and legal status independently.'], ['What should I check before contacting an agent?', 'Review price, area, freshness, verification status, and comparable properties first.'], ['Can I compare properties on Gharazi?', 'Yes, add properties to Compare to review price, area, amenities, and trust signals.']];
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black">Search help</h2>
      <div className="mt-4 grid gap-3">
        {items.map(([question, answer]) => (
          <details key={question} className="rounded-lg border border-line bg-white p-4">
            <summary className="cursor-pointer font-bold">{question}</summary>
            <p className="mt-2 text-sm text-muted">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ContextualGuidesSection({ posts }: { posts: BlogPost[] }) {
  return posts.length ? <div className="mt-10"><RelatedGuides posts={posts} /></div> : null;
}
