import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Subscriptions' };

export default function AdminSubscriptionsPage() {
  return <AdminResourceClient resource="subscriptions" />;
}
