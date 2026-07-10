import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Help for posting listings, searching property, professional accounts, and safe property decisions.',
};

const sections = [
  {
    title: 'How to post a listing',
    body: 'Create an account, open Add listing, complete each step, add clear photos, review details, then save or publish. Use accurate city, area, price, size, and contact details so buyers can evaluate the listing quickly.',
  },
  {
    title: 'How to search property',
    body: 'Start with buy, rent, or projects, then narrow by city, area, property type, price, size, bedrooms, and verification. Save useful listings after login and use compare for shortlists.',
  },
  {
    title: 'Company / Professional users',
    body: 'Choose Company / Professional if you are an agent, agency, developer, builder, or property business. Current listing and project tools remain available while advanced company profiles, subscriptions, and verification workflows are expanded.',
  },
  {
    title: 'Benefits for agents and developers',
    body: 'Professional users can prepare inventory, manage project information, respond to inquiries, and build trust with clearer contact, media, and verification-ready data.',
  },
  {
    title: 'Safety tips before buying or renting',
    body: 'Verify ownership, identity, documents, price terms, payment requests, possession status, and property condition independently. Do not send sensitive financial details through chat.',
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Help' }]} />
      <h1 className="text-3xl font-black">Help</h1>
      <p className="mt-2 text-muted">Quick guidance for using Gharazi.pk before launch.</p>
      <div className="mt-6 grid gap-4">
        {sections.map((section) => (
          <Card key={section.title} className="p-5">
            <h2 className="text-xl font-black">{section.title}</h2>
            <p className="mt-2 leading-7 text-muted">{section.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
