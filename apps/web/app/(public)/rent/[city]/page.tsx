import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const name = readable(city);
  return { title: `Rent property in ${name}`, description: `Find rental homes and apartments in ${name} with fresh updates and direct inquiry flows.` };
}

export default async function RentCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const name = readable(city);
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`Rent property in ${name}`} description={`Search rental homes and apartments in ${name} with freshness cues, verified signals, area links, and low-friction inquiry actions.`} purpose="rent" city={name} citySlug={city} guides={guides} />;
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
