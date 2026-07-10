import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectActionPanel } from '@/components/projects/project-action-panel';
import { CompareButton } from '@/components/compare/compare-button';
import { InvestmentSummary } from '@/components/projects/investment-summary';
import { RelatedGuides } from '@/components/content/blog-card';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { GlobalSearchBar } from '@/components/search/global-search-bar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { ProjectDisclaimer, SponsoredDisclaimer } from '@/components/legal/disclaimers';
import { listLatestBlogPosts } from '@/lib/api/wordpress';
import { getProject, getSimilarProjects } from '@/lib/api/marketplace';
import { getAreaHref, getProjectsCityHref } from '@/lib/routes';
import { formatDate, formatPrice } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return {
    title: project.name,
    description: `${project.name} by ${project.developerName} in ${project.areaName}, ${project.cityName}.`,
    alternates: { canonical: `/project/${slug}` },
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, guides] = await Promise.all([getProject(slug), listLatestBlogPosts(3)]);
  if (!project) notFound();
  const similarProjects = await getSimilarProjects(project.id).catch(() => []);
  const displayedSimilarProjects = similarProjects.filter((item) => item.slug !== project.slug).slice(0, 3);
  const cityHref = project.citySlug ? getProjectsCityHref(project.citySlug) : '/projects';
  const areaHref = project.areaSlug ? getAreaHref(project.areaSlug) : undefined;

  return (
    <>
    <ViewTracker eventType="project_viewed" entityType="project" entityId={project.id} metadataJson={{ slug: project.slug }} />
    <GlobalSearchBar initialTab="projects" compact />
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: project.cityName, href: cityHref },
        { label: project.areaName, href: areaHref },
        { label: project.name },
      ]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid gap-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-stone-200">
            {project.coverImageUrl ? <Image src={project.coverImageUrl} alt="" fill className="object-cover" priority /> : null}
          </div>
          <section>
            <div className="flex flex-wrap gap-2">
              {project.verificationStatus === 'verified' ? <Badge>Verified developer/project</Badge> : null}
              {project.legalStatus ? <Badge className="bg-sky-50 text-sky">{project.legalStatus}</Badge> : null}
              {project.possessionStatus ? <InfoChip>{project.possessionStatus}</InfoChip> : null}
            </div>
            <h1 className="mt-4 text-3xl font-black">{project.name}</h1>
            <p className="mt-2 text-lg font-bold text-muted">{project.developerName}</p>
            <p className="mt-1 text-muted">{project.areaName}, {project.cityName}</p>
            <div className="mt-4 flex flex-wrap gap-2"><CompareButton type="project" id={project.id} /></div>
          </section>
          <ProjectDisclaimer />
          <Card className="p-5"><h2 className="text-xl font-black">Project overview</h2><p className="mt-3 leading-7 text-muted">{project.description}</p></Card>
          <InvestmentSummary project={project} />
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="p-4"><p className="text-sm text-muted">Starting from</p><p className="text-xl font-black">{formatPrice(project.minPriceAmount)}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted">Launch</p><p className="text-xl font-black">{formatDate(project.launchDate)}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted">Handover</p><p className="text-xl font-black">{formatDate(project.expectedHandoverDate)}</p></Card>
          </div>
          <Card className="p-5"><h2 className="text-xl font-black">Payment plan</h2><p className="mt-3 text-muted">{project.paymentPlanSummary ?? 'Payment plan will be published after developer verification.'}</p><Button className="mt-4" variant="secondary">Request brochure</Button></Card>
          <Card className="p-5">
            <h2 className="text-xl font-black">Unit types</h2>
            <div className="mt-3 grid gap-2">
              {project.units?.map((unit) => (
                <div key={unit.id} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-3">
                  <strong>{unit.type}</strong><span className="text-muted">{unit.size}</span><span className="font-bold">{formatPrice(unit.price)}</span>
                </div>
              )) ?? <p className="text-muted">Unit inventory will be added by the developer.</p>}
            </div>
          </Card>
          <Card className="p-5"><h2 className="text-xl font-black">Amenities</h2><div className="mt-3 flex flex-wrap gap-2">{project.amenities?.map((item) => <InfoChip key={item}>{item}</InfoChip>)}</div></Card>
          <Card className="p-5"><h2 className="text-xl font-black">Progress updates</h2><div className="mt-3 grid gap-3">{project.updates?.map((update) => <div key={update.id}><p className="font-bold">{update.title}</p><p className="text-sm text-muted">{formatDate(update.date)} - {update.summary}</p></div>) ?? <p className="text-muted">Developer progress updates will appear here.</p>}</div></Card>
          <Card className="p-5"><h2 className="text-xl font-black">Location</h2><div className="mt-3 flex h-52 items-center justify-center rounded-lg bg-stone-100 text-sm font-semibold text-muted">Map placeholder for {project.areaName}</div></Card>
          <section>
            <h2 className="mb-4 text-xl font-black">Similar projects</h2>
            <SponsoredDisclaimer className="mb-4" />
            {displayedSimilarProjects.length ? (
              <div className="grid gap-4 md:grid-cols-2">{displayedSimilarProjects.map((item) => <ProjectCard key={item.id} project={item} />)}</div>
            ) : <EmptyState title="No similar projects yet" message="Related projects will appear here as matching inventory is published." />}
          </section>
          <RelatedGuides posts={guides} />
        </div>
        <ProjectActionPanel project={project} />
      </div>
    </div>
    </>
  );
}
