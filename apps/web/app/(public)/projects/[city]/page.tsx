import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { generateCityMetadata, readableSlug } from '@/lib/seo/seo-templates';
import { listLatestBlogPosts } from '@/lib/api/wordpress';

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  return generateCityMetadata('projects', readableSlug(city));
}

export default async function ProjectsCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`New projects in ${readableSlug(city)}`} description={`Compare new and upcoming projects in ${readableSlug(city)} with legal status, possession timelines, payment plans, developer information, and investment guides.`} city={readableSlug(city)} citySlug={city} guides={guides} />;
}
