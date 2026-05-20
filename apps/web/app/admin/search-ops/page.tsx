import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Search Ops' };

export default function AdminSearchOpsPage() {
  return <AdminResourceClient resource="search-ops" />;
}
