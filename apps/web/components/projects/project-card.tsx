import Image from 'next/image';
import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import type { Project } from '@/types/marketplace';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { CompareButton } from '@/components/compare/compare-button';
import { getProjectHref } from '@/lib/routes';

export function ProjectCard({ project }: { project: Project }) {
  const detailsHref = getProjectHref(project);

  return (
    <Card className="relative overflow-hidden border-sky/20">
      <Link href={detailsHref} aria-label={`View project details for ${project.name}`} className="relative block aspect-[16/10] bg-stone-200">
        {project.coverImageUrl ? <Image src={project.coverImageUrl} alt={`${project.name} project in ${project.areaName}, ${project.cityName}`} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /> : null}
        {project.legalStatus ? <Badge className="absolute left-3 top-3 bg-sky-50 text-sky">{project.legalStatus}</Badge> : null}
      </Link>
      <div className="absolute right-3 top-3"><FavoriteButton compact entityType="project" entityId={project.id} /></div>
      <div className="grid gap-3 p-3.5 sm:p-4">
        <div>
          <p className="text-xl font-black text-ink">{formatPrice(project.minPriceAmount)} onward</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-black">{project.name}</h2>
          <p className="text-sm font-semibold text-muted">{project.developerName}</p>
          <p className="mt-1 line-clamp-1 text-sm text-muted">{[project.areaName, project.cityName].filter(Boolean).join(', ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InfoChip>{project.projectTypeName ?? 'Project'}</InfoChip>
          {project.possessionStatus ? <InfoChip>{project.possessionStatus}</InfoChip> : null}
        </div>
        {project.paymentPlanSummary ? <p className="line-clamp-2 text-sm text-muted">{project.paymentPlanSummary}</p> : null}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Button href={detailsHref} asChild className="flex-1">View project</Button>
          <CompareButton className="min-w-24" type="project" id={project.id} />
        </div>
      </div>
    </Card>
  );
}
