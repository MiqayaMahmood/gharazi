'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { ErrorAlert } from '@/components/ui/error-alert';
import { deleteSavedSearch, updateSavedSearch } from '@/lib/api/engagement';
import { useSavedSearches } from '@/lib/query/hooks';

export function SavedSearchesClient() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useSavedSearches();
  const deleteMutation = useMutation({ mutationFn: deleteSavedSearch, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }) });
  const toggleMutation = useMutation({
    mutationFn: ({ id, alertEnabled }: { id: string; alertEnabled: boolean }) => updateSavedSearch(id, { alertEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Saved searches failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No saved searches" message="Save high-intent searches from buy, rent, or projects pages." />;

  return (
    <div className="grid gap-4">
      {deleteMutation.isError ? <ErrorAlert error={deleteMutation.error} /> : null}
      {toggleMutation.isError ? <ErrorAlert error={toggleMutation.error} /> : null}
      {data.map((search) => {
        const query = new URLSearchParams();
        Object.entries(search.filtersJson ?? {}).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') query.set(key, String(value));
        });
        return (
          <Card key={search.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black">{search.name}</h2>
                  <Badge className={search.alertEnabled ? undefined : 'border-stone-200 bg-stone-100 text-muted'}>{search.alertEnabled ? 'Alerts on' : 'Alerts off'}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(search.filtersJson ?? {}).map(([key, value]) => <InfoChip key={key}>{key}: {String(value)}</InfoChip>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild href={`/buy?${query.toString()}`} variant="secondary">Run search</Button>
                <Button variant="secondary" onClick={() => toggleMutation.mutate({ id: search.id, alertEnabled: !search.alertEnabled })}>{search.alertEnabled ? 'Disable alerts' : 'Enable alerts'}</Button>
                <Button variant="ghost" onClick={() => deleteMutation.mutate(search.id)}>Delete</Button>
              </div>
            </div>
            <Link href={`/buy?${query.toString()}`} className="mt-3 inline-block text-sm font-bold text-trust">Open matching listings</Link>
          </Card>
        );
      })}
    </div>
  );
}
