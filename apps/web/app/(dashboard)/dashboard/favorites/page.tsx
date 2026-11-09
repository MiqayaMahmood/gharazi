import type { Metadata } from 'next';
import { FavoritesClient } from '@/components/favorites/favorites-client';

export const metadata: Metadata = {
  title: 'Dashboard favorites',
  description: 'Manage saved listings and projects.',
};

export default function DashboardFavoritesPage() {
  return (
    <div>
      <h1 className="text-2xl font-black sm:text-3xl">Favorites</h1>
      <p className="mt-2 text-muted">Saved listings and projects for quick comparison.</p>
      <div className="mt-6"><FavoritesClient /></div>
    </div>
  );
}
