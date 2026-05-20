import type { Metadata } from 'next';
import { SavedSearchesClient } from '@/components/saved-searches/saved-searches-client';

export const metadata: Metadata = {
  title: 'Saved searches',
  description: 'Manage saved search alerts.',
};

export default function SavedSearchesPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Saved searches</h1>
      <p className="mt-2 text-muted">Run, delete, and manage alert status for repeat searches.</p>
      <div className="mt-6"><SavedSearchesClient /></div>
    </div>
  );
}
