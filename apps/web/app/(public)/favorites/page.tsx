import type { Metadata } from 'next';
import { ProtectedContent } from '@/components/auth/protected-content';
import { FavoritesClient } from '@/components/favorites/favorites-client';

export const metadata: Metadata = {
  title: 'Favorites',
    description: 'Saved listings and projects on Gharazi Pakistan.',
};

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Favorites</h1>
      <p className="mt-2 text-muted">Saved listings and projects for quick comparison.</p>
      <div className="mt-6">
        <ProtectedContent>
          <FavoritesClient />
        </ProtectedContent>
      </div>
    </div>
  );
}
