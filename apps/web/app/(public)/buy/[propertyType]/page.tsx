import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { generateCityMetadata, generatePropertyTypeMetadata, readableSlug } from '@/lib/seo/seo-templates';

export async function generateMetadata({ params }: { params: Promise<{ propertyType: string }> }): Promise<Metadata> {
  const { propertyType } = await params;
  if (isKnownCitySlug(propertyType)) {
    return generateCityMetadata('sale', readableSlug(propertyType));
  }
  return generatePropertyTypeMetadata(readableSlug(propertyType), undefined, 'sale', propertyType);
}

export default async function BuyCityPage({ params }: { params: Promise<{ propertyType: string }> }) {
  const { propertyType } = await params;
  if (isKnownCitySlug(propertyType)) {
    const city = readableSlug(propertyType);
    const guides = await listLatestBlogPosts(3);
    return <SeoDiscoveryPage title={`Properties for Sale in ${city}`} description={`Explore property listings for sale in ${city} with popular areas, verified inventory signals, comparison tools, and related guides before you inquire.`} purpose="buy" city={city} citySlug={propertyType} guides={guides} />;
  }
  const name = readableSlug(propertyType);
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`${name} for Sale in Pakistan`} description={`Explore ${name.toLowerCase()} listings with popular areas, verified inventory signals, comparison tools, and related guides before you inquire.`} purpose="buy" propertyType={name} propertyTypeCode={propertyType} guides={guides} />;
}


function isKnownCitySlug(value: string) {
  return ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta'].includes(value);
}
