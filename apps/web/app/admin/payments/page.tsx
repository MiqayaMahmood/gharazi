import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Payments' };

export default function AdminPaymentsPage() {
  return <AdminResourceClient resource="payments" />;
}
