import type { Metadata } from 'next';
import { DashboardOverviewClient } from '@/components/dashboard/dashboard-overview-client';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Gharazi account dashboard shell.',
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Dashboard shell</h1>
      <p className="mt-2 text-muted">Your saved activity, conversations, notifications, and supply overview.</p>
      <div className="mt-6"><DashboardOverviewClient /></div>
    </div>
  );
}
