import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Analytics' };

export default function AdminAnalyticsPage() {
  return <AdminResourceClient resource="analytics" />;
}
