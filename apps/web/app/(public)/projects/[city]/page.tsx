import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  return { title: `New projects in ${readable(city)}`, description: `Explore transparent real-estate projects in ${readable(city)} with possession, legal, and payment-plan signals.` };
}

export default async function ProjectsCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`New projects in ${readable(city)}`} description={`Compare new and upcoming projects in ${readable(city)} with legal status, possession timelines, payment plans, developer information, and investment guides.`} city={readable(city)} citySlug={city} guides={guides} />;
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
