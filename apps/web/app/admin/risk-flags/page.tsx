import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Risk Flags' };

export default function AdminRiskFlagsPage() {
  return <AdminResourceClient resource="risk" />;
}
