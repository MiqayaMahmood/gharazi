'use client';

import { ProjectFormClient } from './project-form-client';
import { EmptyState, Skeleton } from '@/components/ui/state';
import { useMyProjects } from '@/lib/query/hooks';

export function ProjectEditLoader({ id }: { id: string }) {
  const { data = [], isLoading } = useMyProjects();
  if (isLoading) return <Skeleton className="h-96" />;
  const project = data.find((item) => item.id === id || item.slug === id);
  if (!project) return <EmptyState title="Project not found" message="The project may be archived or unavailable for this developer account." />;
  return <ProjectFormClient initialProject={project} />;
}
