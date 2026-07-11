import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { generatePropertyTypeMetadata, readableSlug } from '@/lib/seo/seo-templates';

export async function generateMetadata({ params }: { params: Promise<{ propertyType: string; city: string }> }): Promise<Metadata> {
  const { propertyType, city } = await params;
  return generatePropertyTypeMetadata(readableSlug(propertyType), readableSlug(city), 'sale', propertyType, city);
}

export default async function BuyTypeCityPage({ params }: { params: Promise<{ propertyType: string; city: string }> }) {
  const { propertyType, city } = await params;
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`${readableSlug(propertyType)} for Sale in ${readableSlug(city)}`} description={`A focused discovery page for ${readableSlug(propertyType).toLowerCase()} buyers in ${readableSlug(city)}, with searchable inventory, related areas, and decision guides.`} purpose="buy" city={readableSlug(city)} citySlug={city} propertyType={readableSlug(propertyType)} propertyTypeCode={propertyType} guides={guides} />;
}
