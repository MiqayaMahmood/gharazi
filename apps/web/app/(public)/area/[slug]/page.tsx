import type { Metadata } from 'next';
import Link from 'next/link';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { ListingCard } from '@/components/listings/listing-card';
import { ProjectCard } from '@/components/projects/project-card';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockAreas, mockListings, mockProjects } from '@/lib/mock-data';
import { RelatedGuides } from '@/components/content/blog-card';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { generateAreaMetadata } from '@/lib/seo/seo-templates';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = mockAreas.find((item) => item.slug === slug);
  const title = area ? `${area.name}, ${area.cityName}` : readable(slug);
  return generateAreaMetadata(area?.name ?? readable(slug), area?.cityName ?? 'Pakistan', slug);
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guides = await listLatestBlogPosts(3);
  const area = mockAreas.find((item) => item.slug === slug);
  const title = area ? `${area.name}, ${area.cityName}` : readable(slug);
  const listings = mockListings.filter((item) => !area || item.areaName === area.name);
  const projects = mockProjects.filter((item) => !area || item.areaName === area.name || item.cityName === area.cityName);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <ViewTracker eventType="area_viewed" entityType="area" metadataJson={{ slug, areaId: area?.id, title }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Areas' }, { label: title }]} />
      <Badge>Area intelligence</Badge>
      <h1 className="mt-4 text-4xl font-black">{title}</h1>
      <p className="mt-3 max-w-3xl text-lg text-muted">A structured area page for local discovery, investor context, and internal links across buy, rent, and new project inventory.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/buy?location=${encodeURIComponent(title)}`}><InfoChip>Buy in {area?.name ?? 'area'}</InfoChip></Link>
        <Link href={`/rent?location=${encodeURIComponent(title)}`}><InfoChip>Rent in {area?.name ?? 'area'}</InfoChip></Link>
        <Link href={`/projects?location=${encodeURIComponent(title)}`}><InfoChip>Projects near {area?.name ?? 'area'}</InfoChip></Link>
      </div>
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Card className="p-5"><h2 className="font-black">Trust cues</h2><p className="mt-2 text-sm text-muted">Verified listing and project signals remain visible in related cards.</p></Card>
        <Card className="p-5"><h2 className="font-black">Pricing teaser</h2><p className="mt-2 text-sm text-muted">Area trend APIs can attach here when the intelligence layer expands.</p></Card>
        <Card className="p-5"><h2 className="font-black">Local discovery</h2><p className="mt-2 text-sm text-muted">Internal links connect city, area, project, and property type pages.</p></Card>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-black">Listings in {area?.name ?? title}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">{(listings.length ? listings : mockListings).map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-black">Projects around {area?.name ?? title}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{(projects.length ? projects : mockProjects).map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      </section>
      <RelatedGuides posts={guides} />
    </div>
  );
}

function readable(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
