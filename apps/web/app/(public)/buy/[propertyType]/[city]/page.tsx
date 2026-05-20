import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';

export async function generateMetadata({ params }: { params: Promise<{ propertyType: string; city: string }> }): Promise<Metadata> {
  const { propertyType, city } = await params;
  return { title: `Buy ${readable(propertyType)} in ${readable(city)}`, description: `Browse ${readable(propertyType).toLowerCase()} listings for sale in ${readable(city)}.` };
}

export default async function BuyTypeCityPage({ params }: { params: Promise<{ propertyType: string; city: string }> }) {
  const { propertyType, city } = await params;
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`Buy ${readable(propertyType)} in ${readable(city)}`} description={`A focused discovery page for ${readable(propertyType).toLowerCase()} buyers in ${readable(city)}, with searchable inventory, related areas, and decision guides.`} purpose="buy" city={readable(city)} citySlug={city} propertyType={readable(propertyType)} propertyTypeCode={propertyType} guides={guides} />;
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
