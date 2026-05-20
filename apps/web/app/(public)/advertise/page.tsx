import type { Metadata } from 'next';
import Link from 'next/link';
import { AdvertisingInquiryForm } from '@/components/advertising/advertising-inquiry-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AdvertisingDisclaimer } from '@/components/legal/disclaimers';
import { advertisingFaqs, advertisingPackages, audienceLabels, sponsoredPlacements, type AdvertisingAudience, type AdvertisingPackage } from '@/lib/advertising/packages';

export const metadata: Metadata = {
  title: 'Advertise Property on Gharazi Pakistan | Real Estate Ads & Packages',
  description: 'Promote listings, agencies, projects, and sponsored real-estate campaigns on Gharazi Pakistan with lead-ready advertising packages.',
  alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/advertise` },
};

const audiences: AdvertisingAudience[] = ['individuals', 'agencies', 'developers', 'sponsored'];

export default function AdvertisePage() {
  return (
    <main>
      <section className="border-b border-line bg-[linear-gradient(180deg,#f4f8f4_0%,#fbfbf7_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Badge>Advertising and partnerships</Badge>
            <h1 className="mt-4 text-4xl font-black md:text-5xl">Grow your real estate business with Gharazi</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">Reach serious buyers, tenants, and investors with promoted listings, verified agency visibility, transparent project campaigns, and direct inquiry flows.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild href="#advertising-inquiry">Request Advertising Plan</Button>
              <Button asChild href="#packages" variant="secondary">View Packages</Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Direct inquiries and chat-ready leads', 'Verified badges and trust signals', 'Premium listing and project placements', 'Analytics-ready campaign reporting'].map((item) => (
                <span key={item} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">{item}</span>
              ))}
            </div>
          </div>
          <Card className="p-5">
            <h2 className="text-2xl font-black">Built for property teams</h2>
                <p className="mt-2 text-muted">Gharazi sells visibility with context: quality inventory, clear project details, direct communication, and dashboards that help teams understand response.</p>
            <div className="mt-5 grid gap-3">
              {[
                ['Owners', 'Boost a single property without reposting clutter.'],
                ['Agencies', 'Promote multiple listings and build a verified profile.'],
                ['Developers', 'Launch projects with payment plans, updates, and investor-ready detail.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-lg bg-stone-50 p-4">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8" id="packages">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {audiences.map((audience) => <Button key={audience} asChild href={`#${audience}`} variant="secondary">{audienceLabels[audience]}</Button>)}
        </div>
      </section>

      <PackageSection audience="individuals" title="Individual owner packages" description="Promote a property with clear visibility boosts and lead-ready calls to action." />
      <div className="mx-auto max-w-7xl px-4">
        <AdvertisingDisclaimer />
      </div>
      <PackageSection audience="agencies" title="Agency and agent packages" description="Tiered packages for teams that need listing capacity, profile trust, promoted credits, and response visibility." />
      <PackageSection audience="developers" title="Developer and builder packages" description="Campaigns for new projects that emphasize payment plan clarity, progress updates, direct inquiries, and investor confidence." />

      <section className="mx-auto max-w-7xl px-4 py-10" id="sponsored">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-3xl font-black">Sponsored placements and add-ons</h2>
          <p className="mt-2 text-muted">Controlled ad surfaces for brand campaigns, high-intent search journeys, city/area sponsorships, and project launches.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {sponsoredPlacements.map((placement) => (
            <Card key={placement.id} className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-trust">Sponsored</p>
              <h3 className="mt-2 text-lg font-black">{placement.name}</h3>
              <p className="mt-2 text-sm font-semibold">{placement.location}</p>
              <p className="mt-2 text-sm text-muted">{placement.bestUse}</p>
              <p className="mt-3 text-xs text-muted">Creative: {placement.creativeSize}</p>
              <p className="mt-1 text-xs text-muted">Availability: {placement.availability}</p>
              <Button className="mt-4 w-full" asChild href="#advertising-inquiry" variant="secondary">Inquire</Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 lg:grid-cols-3">
          {[
            ['Reach serious property seekers', 'Place inventory and campaigns in discovery journeys where users are already comparing homes, plots, rentals, and projects.'],
            ['Convert faster with communication', 'Advertising routes interest into inquiry and chat flows instead of anonymous impressions only.'],
            ['Build trust, not just traffic', 'Verified badges, profile pages, project transparency, and status signals help users act with confidence.'],
          ].map(([title, copy]) => (
            <Card key={title} className="p-5">
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-black">How it works</h2>
            <p className="mt-2 text-muted">A simple sales-assisted workflow while public beta pricing and self-serve checkout mature.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {['Choose your package', 'Submit inquiry or talk to sales', 'Activate listings or campaign', 'Track leads and performance'].map((step, index) => (
              <div key={step} className="rounded-lg border border-line bg-white p-4">
                <p className="text-sm font-black text-trust">Step {index + 1}</p>
                <p className="mt-1 font-bold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <AdvertisingInquiryForm />
        <FaqSection />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl bg-ink p-6 text-white md:p-8">
          <h2 className="text-3xl font-black">Ready to promote your inventory?</h2>
          <p className="mt-2 max-w-3xl text-white/75">Tell us your market, package interest, and campaign goal. We will help match the right visibility plan without cluttering the user experience.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild href="#advertising-inquiry">Talk to Sales</Button>
            <Button asChild href="/contact" variant="secondary">Contact Gharazi</Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function PackageSection({ audience, title, description }: { audience: AdvertisingAudience; title: string; description: string }) {
  const packages = advertisingPackages.filter((item) => item.audience === audience);
  return (
    <section className="mx-auto max-w-7xl px-4 py-10" id={audience}>
      <div className="mb-5 max-w-3xl">
        <h2 className="text-3xl font-black">{title}</h2>
        <p className="mt-2 text-muted">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {packages.map((item) => <PackageCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function PackageCard({ item }: { item: AdvertisingPackage }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex min-h-8 items-start justify-between gap-3">
        {item.badge ? <Badge>{item.badge}</Badge> : <span />}
      </div>
      <h3 className="mt-3 text-xl font-black">{item.name}</h3>
      <p className="mt-2 text-2xl font-black text-trust">{item.priceLabel}</p>
      {item.billingLabel ? <p className="text-sm font-semibold text-muted">{item.billingLabel}</p> : null}
      <p className="mt-3 text-sm leading-6 text-muted">{item.bestFor}</p>
      <ul className="mt-4 grid flex-1 gap-2 text-sm text-ink">
        {item.features.map((feature) => <li key={feature} className="rounded-md bg-stone-50 px-3 py-2">{feature}</li>)}
      </ul>
      <Button className="mt-5 w-full" asChild href="#advertising-inquiry">{item.ctaLabel}</Button>
    </Card>
  );
}

function FaqSection() {
  return (
    <Card className="p-5" id="faq">
      <h2 className="text-2xl font-black">Advertising FAQ</h2>
      <div className="mt-4 grid gap-2">
        {advertisingFaqs.map(([question, answer]) => (
          <details key={question} className="rounded-lg border border-line bg-stone-50 p-4">
            <summary className="cursor-pointer font-bold">{question}</summary>
            <p className="mt-2 text-sm leading-6 text-muted">{answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">Need a custom plan? <Link className="font-bold text-trust" href="#advertising-inquiry">Send an inquiry</Link>.</p>
    </Card>
  );
}
