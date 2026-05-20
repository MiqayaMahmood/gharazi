import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Users' };

export default function AdminUsersPage() {
  return <AdminResourceClient resource="users" />;
}
