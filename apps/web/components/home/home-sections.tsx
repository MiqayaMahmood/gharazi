import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const categories = [
  ['Buy Property', '/buy', 'Homes, apartments, plots'],
  ['Rent Property', '/rent', 'Fresh rental inventory'],
  ['New Projects', '/projects', 'Payment plans and timelines'],
  ['Commercial', '/buy?propertyTypeCode=commercial', 'Shops, offices, buildings'],
  ['Plots', '/buy?propertyTypeCode=plot', 'Residential and commercial land'],
  ['Explore Areas', '/area/dha-phase-6-lahore', 'Neighborhood discovery'],
];

export function TrustStrip() {
  return (
    <section className="mx-auto grid max-w-7xl gap-3 px-4 py-6 md:grid-cols-4">
      {['Verified listings', 'Direct chat with agents', 'Updated inventory', 'Safer discovery'].map((item) => (
        <Card key={item} className="p-4">
          <Badge>{item}</Badge>
          <p className="mt-2 text-sm text-muted">Visible before users commit to an inquiry.</p>
        </Card>
      ))}
    </section>
  );
}

export function QuickCategories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="text-2xl font-black">Start with what you need</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {categories.map(([title, href, body]) => (
          <Link key={title} href={href}>
            <Card className="h-full p-4 transition hover:border-trust">
              <h3 className="font-black">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AreaDiscovery() {
  const areas = ['DHA Phase 6 Lahore', 'Clifton Karachi', 'G-13 Islamabad', 'Bahria Town', 'Gulberg Lahore'];
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Badge>Area discovery</Badge>
          <h2 className="mt-3 text-2xl font-black">Explore neighborhoods before shortlisting</h2>
          <p className="mt-2 text-muted">Area pages connect inventory, projects, local context, and buyer guides for more confident decisions.</p>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => <Link key={area} href={`/buy?q=${encodeURIComponent(area)}`}><InfoChip>{area}</InfoChip></Link>)}
          </div>
        </Card>
      </div>
    </section>
  );
}

export function FeaturedAgencies() {
  const agencies = [
    ['Crown Estate Advisors', 'Lahore', 'Premium', '/agent/crown-estate-advisors'],
    ['Karachi Homes Network', 'Karachi', 'Verified', '/agent/karachi-homes-network'],
    ['Capital Project Consultants', 'Islamabad', 'Verified', '/developer/capital-project-consultants'],
    ['Bahria Deal Desk', 'Rawalpindi', 'Premium', '/agent/bahria-deal-desk'],
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">Top verified agencies</h2>
          <p className="text-muted">A monetization-ready surface for trusted agencies while dedicated premium feeds mature.</p>
        </div>
        <Badge className="bg-amber-50 text-saffron">Premium-ready</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {agencies.map(([name, city, badge, href]) => (
          <Link key={name} href={href}>
            <Card className="flex h-full items-center gap-3 p-4 transition hover:border-trust">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-lg font-black text-trust">{name.slice(0, 1)}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{name}</h3><Badge>{badge}</Badge></div>
                <p className="text-sm text-muted">{city}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PopularQuickSearches() {
  const groups = [
    ['Popular locations for plots', [['DHA Lahore plots', '/buy/plot/lahore'], ['Bahria Town Karachi plots', '/buy/plot/karachi'], ['Gulberg Islamabad plots', '/buy/plot/islamabad']]],
    ['House rent demand', [['Houses for rent in Lahore', '/rent/lahore?propertyTypeCode=house'], ['Karachi family rentals', '/rent/karachi?propertyTypeCode=house'], ['Islamabad rentals', '/rent/islamabad?propertyTypeCode=house']]],
    ['Apartment hotspots', [['Clifton apartments', '/buy/apartment/karachi'], ['Gulberg apartments', '/buy/apartment/lahore'], ['G-13 apartments', '/buy/apartment/islamabad']]],
    ['Commercial searches', [['Shops in Lahore', '/buy?propertyTypeCode=shop'], ['Offices in Karachi', '/buy?propertyTypeCode=office'], ['Warehouses', '/buy?propertyTypeCode=warehouse']]],
  ] as const;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4">
        <Badge>Quick search</Badge>
        <h2 className="mt-3 text-2xl font-black">Popular locations and property searches</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {groups.map(([title, links]) => (
          <Card key={title} className="p-4">
            <h3 className="font-black">{title}</h3>
            <div className="mt-3 grid gap-2">
              {links.map(([label, href]) => <Link className="text-sm font-semibold text-trust hover:underline" key={label} href={href}>{label}</Link>)}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function SmartTools() {
  const tools = [
    ['Compare Properties', '/compare/listings', 'Live', 'Side-by-side price, size, trust, and amenities.'],
    ['Compare Projects', '/compare/projects', 'Live', 'Compare developers, possession, payment plans, and units.'],
    ['Area Guides', '/area/dha-phase-6-lahore', 'Live', 'Explore area context with related inventory.'],
    ['Price Trends', '', 'Coming soon', 'Track city and area price movement.'],
    ['Construction Cost Calculator', '', 'Coming soon', 'Estimate build costs by size and finish.'],
    ['Area Unit Converter', '', 'Coming soon', 'Convert marla, kanal, square feet, and yards.'],
    ['Home Loan Calculator', '', 'Coming soon', 'Plan affordability and monthly payment ranges.'],
    ['Plot Finder', '', 'Coming soon', 'Narrow land searches by area and possession signals.'],
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge>Smart tools</Badge>
          <h2 className="mt-3 text-2xl font-black">Tools for better property decisions</h2>
        </div>
        <Button href="/compare/listings" asChild variant="secondary">Open compare</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map(([title, href, status, body]) => {
          const content = (
            <Card className="h-full p-4 transition hover:border-trust">
              <div className="flex items-center justify-between gap-3"><h3 className="font-black">{title}</h3><Badge className={status === 'Live' ? '' : 'bg-stone-100 text-muted'}>{status}</Badge></div>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </Card>
          );
          return href ? <Link key={title} href={href}>{content}</Link> : <div key={title}>{content}</div>;
        })}
      </div>
    </section>
  );
}

export function WhyChooseUs() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Smarter search', 'High-intent filters and shareable URLs.'],
          ['Safer inventory', 'Verification and freshness cues stay visible.'],
          ['Project clarity', 'Payment plans, possession, units, and updates.'],
          ['Built-in communication', 'Inquiries and chat connect action to follow-up.'],
        ].map(([title, body]) => (
          <div key={title}>
            <h3 className="font-black">{title}</h3>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
