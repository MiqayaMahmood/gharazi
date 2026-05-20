'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NewsletterSignupSection } from '@/components/newsletter/newsletter-signup-section';

const columns = [
  { title: 'Explore', links: [['Buy', '/buy'], ['Rent', '/rent'], ['Projects', '/projects'], ['Areas', '/area/dha-phase-6-lahore'], ['Blog / Guides', '/blog']] },
  { title: 'For Property Owners', links: [['Post Property', '/dashboard/listings/new'], ['Advertise with Gharazi', '/advertise'], ['Packages', '/advertise#packages'], ['My Listings', '/dashboard/listings']] },
  { title: 'Company', links: [['About', '/about'], ['Contact', '/contact'], ['Feedback', '/contact#feedback'], ['Support', '/contact#faq']] },
  { title: 'Legal & Trust', links: [['Terms', '/terms'], ['Privacy Policy', '/privacy-policy'], ['Disclaimer', '/disclaimer'], ['Anti-Spam Policy', '/anti-spam-policy'], ['Platform Neutrality', '/platform-neutrality'], ['Advertising Disclaimer', '/advertising-disclaimer'], ['Cookie Policy', '/cookie-policy']] },
  { title: 'Tools', links: [['Compare Properties', '/compare/listings'], ['Compare Projects', '/compare/projects'], ['Area Guides', '/area/dha-phase-6-lahore'], ['Price Trends', '/blog'], ['Unit Converter', '/blog']] },
];

const socials = [['Facebook', '#'], ['Instagram', '#'], ['LinkedIn', '#'], ['YouTube', '#']];

export function PublicFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return (
    <footer className="border-t border-line bg-white">
      <NewsletterSignupSection />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" className="text-xl font-black text-ink">Gharazi.pk</Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">Pakistan real estate discovery with verified inventory, transparent project information, and safer communication flows.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-trust">
            {socials.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-black">{column.title}</p>
              <div className="mt-3 grid gap-2 text-sm text-muted">
                {column.links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted">
          <p>(c) {new Date().getFullYear()} Gharazi.pk. All rights reserved.</p>
          <p>Beta product. Verify all property information before transaction.</p>
        </div>
      </div>
    </footer>
  );
}
