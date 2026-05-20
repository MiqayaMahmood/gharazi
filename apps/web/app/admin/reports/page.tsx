import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Reports' };

export default function AdminReportsPage() {
  return <AdminResourceClient resource="reports" />;
}
