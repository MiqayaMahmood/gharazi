import type { Metadata } from 'next';
import { MyListingsClient } from '@/components/dashboard/supply-list-client';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'My listings',
  description: 'Manage your property listings.',
};

export default function MyListingsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-black sm:text-3xl">My listings</h1><p className="mt-2 text-muted">Manage property details, leads, promotion, and listing status.</p></div>
        <Button asChild href="/dashboard/listings/new">Post property</Button>
      </div>
      <div className="mt-6"><MyListingsClient /></div>
    </div>
  );
}
