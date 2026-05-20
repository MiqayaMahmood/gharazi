import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Submissions' };

export default function AdminSubmissionsPage() {
  return <AdminResourceClient resource="submissions" />;
}
