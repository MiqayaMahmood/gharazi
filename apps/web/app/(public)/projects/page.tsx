import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProjectResultsClient } from '@/components/search/project-results-client';
import { Skeleton } from '@/components/ui/state';

export const metadata: Metadata = {
  title: 'New projects in Pakistan',
  description: 'Discover transparent new real-estate projects with payment plans, possession status, and legal signals.',
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96" /></div>}>
      <ProjectResultsClient />
    </Suspense>
  );
}
