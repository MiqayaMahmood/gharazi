import Image from 'next/image';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import type { Project } from '@/types/marketplace';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { CompareButton } from '@/components/compare/compare-button';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="overflow-hidden border-sky/20">
      <div className="relative aspect-[16/10] bg-stone-200">
        {project.coverImageUrl ? <Image src={project.coverImageUrl} alt="" fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /> : null}
        {project.legalStatus ? <Badge className="absolute left-3 top-3 bg-sky-50 text-sky">{project.legalStatus}</Badge> : null}
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <h2 className="text-lg font-black">{project.name}</h2>
          <p className="text-sm font-semibold text-muted">{project.developerName}</p>
          <p className="mt-1 text-sm text-muted">{project.areaName}, {project.cityName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InfoChip>{project.projectTypeName ?? 'Project'}</InfoChip>
          <InfoChip>{project.possessionStatus ?? 'Status pending'}</InfoChip>
          <InfoChip>{formatPrice(project.minPriceAmount)} onward</InfoChip>
        </div>
        <p className="text-sm text-muted">{project.paymentPlanSummary ?? 'Payment plan details available on request.'}</p>
        <div className="flex gap-2">
          <Button href={`/project/${project.slug}`} asChild className="flex-1">View project</Button>
          <FavoriteButton entityType="project" entityId={project.id} />
        </div>
        <CompareButton type="project" id={project.id} />
      </div>
    </Card>
  );
}
