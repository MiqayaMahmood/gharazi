'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ListingCard } from '@/components/listings/listing-card';
import { ProjectCard } from '@/components/projects/project-card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { Tabs } from '@/components/ui/tabs';
import { removeFavorite } from '@/lib/api/engagement';
import { useFavorites } from '@/lib/query/hooks';
import type { Favorite, FavoriteEntityType } from '@/types/engagement';

const tabs: Array<{ value: FavoriteEntityType; label: string }> = [
  { value: 'listing', label: 'Listings' },
  { value: 'project', label: 'Projects' },
  { value: 'agency', label: 'Agents / agencies' },
  { value: 'developer', label: 'Developers' },
  { value: 'area', label: 'Areas' },
  { value: 'blog', label: 'Blogs / guides' },
  { value: 'tool', label: 'Tools' },
];

export function FavoritesClient() {
  const [tab, setTab] = useState<FavoriteEntityType>('listing');
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useFavorites();
  const removeMutation = useMutation({
    mutationFn: (input: { entityType: FavoriteEntityType; entityId: string }) => removeFavorite(input.entityType, input.entityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });
  const selected = data.filter((favorite) => favorite.entityType === tab);

  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Favorites failed to load" message="Please retry after refreshing the page." />;

  return (
    <div className="grid gap-5">
      <Tabs tabs={tabs.map((item) => item.value)} value={tab} onChange={setTab} />
      {selected.length === 0 ? <EmptyState title={`No saved ${tabs.find((item) => item.value === tab)?.label.toLowerCase()} yet`} message="Save useful items to build your shortlist. Agent/agency and tool bookmarks need stable backend entities before they can be saved." /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {selected.map((favorite) => {
          return (
            <div key={favorite.id} className="grid gap-2">
              {favorite.entityType === 'listing' && favorite.listing ? <ListingCard listing={favorite.listing} /> : null}
              {favorite.entityType === 'project' && favorite.project ? <ProjectCard project={favorite.project} /> : null}
              {!favorite.listing && !favorite.project ? <SavedItemCard favorite={favorite} /> : null}
              <Button variant="secondary" onClick={() => removeMutation.mutate({ entityType: favorite.entityType, entityId: favorite.entityId })}>Remove</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavedItemCard({ favorite }: { favorite: Favorite }) {
  const href = favorite.url;
  const title = favorite.title ?? favorite.developer?.companyName ?? favorite.area?.name ?? favorite.blog?.title ?? 'Saved item';
  const meta = favorite.area?.cityName ?? favorite.developer?.verificationStatus ?? favorite.blog?.publishedAt ?? favorite.entityType;
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{favorite.entityType}</p>
      <h3 className="mt-2 text-lg font-black">{href ? <Link href={href}>{title}</Link> : title}</h3>
      <p className="mt-1 text-sm text-muted">{meta}</p>
      {href ? <Link href={href} className="mt-4 inline-flex text-sm font-bold text-trust">Open item</Link> : null}
    </div>
  );
}
