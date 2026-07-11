import { AdminShell } from '@/components/admin/admin-shell';
import type { Metadata } from 'next';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
