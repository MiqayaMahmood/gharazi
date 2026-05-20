import type { Metadata } from 'next';
import { MyListingsClient } from '@/components/dashboard/supply-list-client';

export const metadata: Metadata = {
  title: 'My listings',
  description: 'Manage your property listings.',
};

export default function MyListingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">My listings</h1>
      <p className="mt-2 text-muted">Foundational owner/agent list view. Full add/edit flows come next.</p>
      <div className="mt-6"><MyListingsClient /></div>
    </div>
  );
}
