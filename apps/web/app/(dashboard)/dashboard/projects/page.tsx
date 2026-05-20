import type { Metadata } from 'next';
import { MyProjectsClient } from '@/components/dashboard/supply-list-client';

export const metadata: Metadata = {
  title: 'My projects',
  description: 'Manage developer projects.',
};

export default function MyProjectsPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">My projects</h1>
      <p className="mt-2 text-muted">Foundational developer list view. Full project form builders come next.</p>
      <div className="mt-6"><MyProjectsClient /></div>
    </div>
  );
}
