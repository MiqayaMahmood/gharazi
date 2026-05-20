import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Listings' };

export default function AdminListingsPage() {
  return <AdminResourceClient resource="listings" />;
}
