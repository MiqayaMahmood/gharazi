import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { generateCityMetadata, readableSlug } from '@/lib/seo/seo-templates';

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  return generateCityMetadata('rent', readableSlug(city));
}

export default async function RentCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const name = readableSlug(city);
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`Rent property in ${name}`} description={`Search rental homes and apartments in ${name} with freshness cues, verified signals, area links, and low-friction inquiry actions.`} purpose="rent" city={name} citySlug={city} guides={guides} />;
}
