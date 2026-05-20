import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Audit Logs' };

export default function AdminAuditLogsPage() {
  return <AdminResourceClient resource="audit" />;
}
