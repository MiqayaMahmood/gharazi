'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useBatchProjects } from '@/lib/query/hooks';
import { formatDate, formatPrice } from '@/lib/utils';
import { useCompareStore } from '@/stores/ui-store';

const rows = [
  ['Developer', (id: string, lookup: ProjectLookup) => lookup[id]?.developerName ?? '-'],
  ['Location', (id: string, lookup: ProjectLookup) => `${lookup[id]?.areaName}, ${lookup[id]?.cityName}`],
  ['Possession', (id: string, lookup: ProjectLookup) => lookup[id]?.possessionStatus ?? '-'],
  ['Legal status', (id: string, lookup: ProjectLookup) => lookup[id]?.legalStatus ?? '-'],
  ['Price range', (id: string, lookup: ProjectLookup) => `${formatPrice(lookup[id]?.minPriceAmount)} - ${formatPrice(lookup[id]?.maxPriceAmount)}`],
  ['Payment plan', (id: string, lookup: ProjectLookup) => lookup[id]?.paymentPlanSummary ?? '-'],
  ['Units', (id: string, lookup: ProjectLookup) => lookup[id]?.units?.map((unit) => unit.type).join(', ') ?? '-'],
  ['Latest update', (id: string, lookup: ProjectLookup) => formatDate(lookup[id]?.updates?.[0]?.date)],
  ['Amenities', (id: string, lookup: ProjectLookup) => lookup[id]?.amenities?.join(', ') ?? '-'],
];

type ProjectLookup = Record<string, import('@/types/marketplace').Project | undefined>;

export function ProjectComparisonClient() {
  const ids = useCompareStore((state) => state.projectIds);
  const remove = useCompareStore((state) => state.removeProject);
  const clear = useCompareStore((state) => state.clearProjects);
  const query = useBatchProjects(ids);
  const lookup = Object.fromEntries((query.data ?? []).map((project) => [project.id, project])) as ProjectLookup;
  const validIds = ids.filter((id) => lookup[id]);
  const staleIds = ids.filter((id) => query.data && !lookup[id]);

  if (!ids.length) return <EmptyState title="No projects selected" message="Use Compare on project cards or project detail pages to evaluate payment plans, possession, and legal status." />;
  if (query.isLoading) return <Skeleton className="h-96" />;
  if (query.isError) return <ErrorState title="Compare data unavailable" message="The selected projects could not be loaded from the backend. Try refreshing or clearing stale items." />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm text-muted">Compare project transparency signals and investor-relevant facts.</p>
        <Button variant="secondary" onClick={clear}>Clear comparison</Button>
      </div>
      <Card className="overflow-auto">
        <table className="min-w-[820px] w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-line p-3 text-left">Field</th>
              {validIds.map((id) => (
                <th key={id} className="border-b border-line p-3 text-left">
                  <Link className="font-black text-trust" href={`/project/${lookup[id]?.slug}`}>{lookup[id]?.name}</Link>
                  <Button className="mt-2" variant="ghost" onClick={() => remove(id)}>Remove</Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, getter]) => (
              <tr key={label as string}>
                <td className="border-b border-line bg-stone-50 p-3 font-bold">{label as string}</td>
                {validIds.map((id) => <td key={id} className="border-b border-line p-3">{(getter as (id: string, lookup: ProjectLookup) => string)(id, lookup)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {staleIds.length ? <Button variant="secondary" onClick={() => staleIds.forEach(remove)}>Remove {staleIds.length} unavailable item{staleIds.length > 1 ? 's' : ''}</Button> : null}
    </div>
  );
}
