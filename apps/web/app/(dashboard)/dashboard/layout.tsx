import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import type { Metadata } from 'next';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
