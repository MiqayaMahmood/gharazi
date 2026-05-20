import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Data Integrity' };

export default function AdminDataIntegrityPage() {
  return <AdminResourceClient resource="data-integrity" />;
}
