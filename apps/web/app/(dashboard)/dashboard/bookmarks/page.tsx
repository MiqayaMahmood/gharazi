import type { Metadata } from 'next';
import { FavoritesClient } from '@/components/favorites/favorites-client';

export const metadata: Metadata = {
  title: 'Dashboard bookmarks',
  description: 'Manage saved areas, developers, guides, and tools.',
};

export default function DashboardBookmarksPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Bookmarks</h1>
      <p className="mt-2 text-muted">Saved areas, developers, guides, and tools will appear here as bookmark support expands.</p>
      <div className="mt-6"><FavoritesClient /></div>
    </div>
  );
}
