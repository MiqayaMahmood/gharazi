import type { Metadata } from 'next';
import { DashboardOverviewClient } from '@/components/dashboard/dashboard-overview-client';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Gharazi account dashboard shell.',
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-black sm:text-3xl">Dashboard</h1>
      <p className="mt-2 text-muted">Your saved activity, conversations, notifications, and supply overview.</p>
      <div className="mt-6"><DashboardOverviewClient /></div>
    </div>
  );
}
