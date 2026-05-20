import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Verification Requests' };

export default function AdminVerificationRequestsPage() {
  return <AdminResourceClient resource="verification" />;
}
