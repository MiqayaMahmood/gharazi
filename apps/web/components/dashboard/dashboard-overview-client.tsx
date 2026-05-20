'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/state';
import { StatCard } from './stat-card';
import { useChats, useFavorites, useMyListings, useMyProjects, useNotifications, useSavedSearches } from '@/lib/query/hooks';

export function DashboardOverviewClient() {
  const favorites = useFavorites();
  const savedSearches = useSavedSearches();
  const chats = useChats();
  const notifications = useNotifications();
  const listings = useMyListings();
  const projects = useMyProjects();

  if (favorites.isLoading || savedSearches.isLoading || chats.isLoading || notifications.isLoading) return <Skeleton className="h-96" />;

  const unread = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const savedItems = favorites.data ?? [];
  const favoriteListings = savedItems.filter((item) => item.entityType === 'listing').length;
  const favoriteProjects = savedItems.filter((item) => item.entityType === 'project').length;
  const bookmarkedPages = savedItems.filter((item) => ['developer', 'area', 'blog', 'tool'].includes(item.entityType)).length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Saved items" value={savedItems.length} detail="Favorites and bookmarks" />
        <StatCard label="Listings" value={favoriteListings} detail="Favorite properties" />
        <StatCard label="Projects" value={favoriteProjects} detail="Favorite developments" />
        <StatCard label="Bookmarks" value={bookmarkedPages} detail="Areas and profiles" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Saved searches" value={savedSearches.data?.length ?? 0} detail="Alert-ready searches" />
        <StatCard label="Chats" value={chats.data?.length ?? 0} detail="Open conversations" />
        <StatCard label="Unread" value={unread} detail="Notifications needing review" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-lg font-black">Shortlist smarter</h2>
          <p className="mt-2 text-sm text-muted">Compare saved listings or project plans before opening a new inquiry.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild href="/compare/listings" variant="secondary">Compare listings</Button>
            <Button asChild href="/compare/projects" variant="secondary">Compare projects</Button>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-black">Keep searches warm</h2>
          <p className="mt-2 text-sm text-muted">Saved searches and alerts help repeat buyers return to the right filters.</p>
          <Button className="mt-4" asChild href="/dashboard/saved-searches" variant="secondary">Manage saved searches</Button>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-black">Respond faster</h2>
          <p className="mt-2 text-sm text-muted">Chats and inquiries are grouped so owners, agents, and buyers can keep momentum.</p>
          <Button className="mt-4" asChild href="/dashboard/chats" variant="secondary">Open chats</Button>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Recent saved items</h2>
            <Link href="/dashboard/favorites" className="text-sm font-bold text-trust">View all</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {savedItems.slice(0, 4).map((item) => (
              <Link key={`${item.entityType}:${item.entityId}`} href={item.url ?? '/dashboard/favorites'} className="rounded-md bg-stone-50 p-3 text-sm font-semibold">
                {item.title ?? item.listing?.title ?? item.project?.name ?? item.entityType}
              </Link>
            ))}
            {!savedItems.length ? <EmptyState title="No saved items yet" message="Save listings, projects, areas, or profiles to return quickly." /> : null}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Recent chats</h2>
            <Link href="/dashboard/chats" className="text-sm font-bold text-trust">Open inbox</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {chats.data?.slice(0, 3).map((chat) => <p key={chat.id} className="rounded-md bg-stone-50 p-3 text-sm font-semibold">{chat.contextType ?? 'Conversation'} {chat.id.slice(0, 8)}</p>)}
            {!chats.data?.length ? <EmptyState title="No chats yet" message="Start with an inquiry on a listing or project." /> : null}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Supply activity</h2>
            <Link href="/dashboard/listings" className="text-sm font-bold text-trust">Manage supply</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard label="My listings" value={listings.data?.length ?? 0} />
            <StatCard label="My projects" value={projects.data?.length ?? 0} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild href="/dashboard/listings/new">Add listing</Button>
            <Button asChild href="/dashboard/projects/new" variant="secondary">Add project</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
