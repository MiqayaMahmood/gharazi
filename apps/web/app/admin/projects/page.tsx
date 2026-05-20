import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Projects' };

export default function AdminProjectsPage() {
  return <AdminResourceClient resource="projects" />;
}
