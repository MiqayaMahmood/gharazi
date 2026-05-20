import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { PublicFooter } from '@/components/layout/public-footer';
import { PublicHeader } from '@/components/layout/public-header';
import { CompareTray } from '@/components/compare/compare-tray';
import { SupportWidget } from '@/components/support/support-widget';
import { AdsenseScript } from '@/components/ads/adsense-script';
import { CookieNotice } from '@/components/legal/cookie-notice';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
      default: 'Gharazi Pakistan | Smart, safer real estate search',
      template: '%s | Gharazi Pakistan',
  },
  description: 'Search verified homes, plots, commercial properties, and transparent new projects across Pakistan.',
  openGraph: {
    title: 'Gharazi Pakistan',
    description: 'Pakistan real estate search with verified listings, fresh inventory, and safer inquiries.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AdsenseScript />
          <PublicHeader />
          <main>{children}</main>
          <CompareTray />
          <SupportWidget />
          <CookieNotice />
          <PublicFooter />
        </Providers>
      </body>
    </html>
  );
}
