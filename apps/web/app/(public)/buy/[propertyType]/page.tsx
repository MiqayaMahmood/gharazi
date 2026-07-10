import type { Metadata } from 'next';
import { SeoDiscoveryPage } from '@/components/seo/seo-discovery-page';
import { listLatestBlogPosts } from '@/lib/api/wordpress';

export async function generateMetadata({ params }: { params: Promise<{ propertyType: string }> }): Promise<Metadata> {
  const { propertyType } = await params;
  if (isKnownCitySlug(propertyType)) {
    const city = readable(propertyType);
    return { title: `Properties for Sale in ${city}`, description: `Browse property listings for sale in ${city}.` };
  }
  const name = readable(propertyType);
  return { title: `Buy ${name} in Pakistan`, description: `Browse ${name.toLowerCase()} for sale in Pakistan with verified signals and safer inquiries.` };
}

export default async function BuyCityPage({ params }: { params: Promise<{ propertyType: string }> }) {
  const { propertyType } = await params;
  if (isKnownCitySlug(propertyType)) {
    const city = readable(propertyType);
    const guides = await listLatestBlogPosts(3);
    return <SeoDiscoveryPage title={`Properties for Sale in ${city}`} description={`Explore property listings for sale in ${city} with popular areas, verified inventory signals, comparison tools, and related guides before you inquire.`} purpose="buy" city={city} citySlug={propertyType} guides={guides} />;
  }
  const name = readable(propertyType);
  const guides = await listLatestBlogPosts(3);
  return <SeoDiscoveryPage title={`${name} for Sale in Pakistan`} description={`Explore ${name.toLowerCase()} listings with popular areas, verified inventory signals, comparison tools, and related guides before you inquire.`} purpose="buy" propertyType={name} propertyTypeCode={propertyType} guides={guides} />;
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function isKnownCitySlug(value: string) {
  return ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta'].includes(value);
}
