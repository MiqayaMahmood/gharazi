import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About Gharazi Pakistan',
  description: 'Learn about gharazi.pk mission, trust approach, and real estate discovery platform.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="max-w-4xl">
        <h1 className="text-4xl font-black">A cleaner, safer way to discover property in Pakistan</h1>
            <p className="mt-4 text-lg leading-8 text-muted">gharazi.pk is built around trust, transparency, and communication. We help buyers, renters, owners, agents, and developers move from search to inquiry with less clutter and more useful context.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/buy" asChild>Explore listings</Button>
          <Button href="/projects" asChild variant="secondary">Explore projects</Button>
          <Button href="/login?next=/dashboard/listings/new" asChild variant="secondary">Post property</Button>
        </div>
      </section>
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ['Trust first', 'Verified badges, freshness cues, report flows, and moderation support safer discovery.'],
          ['Project transparency', 'Project pages emphasize legal status, possession, payment plans, units, and progress updates.'],
          ['Communication ready', 'Inquiry and chat flows keep follow-up organized without mixing platform support with marketplace chat.'],
        ].map(([title, body]) => (
          <Card key={title} className="p-5">
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
