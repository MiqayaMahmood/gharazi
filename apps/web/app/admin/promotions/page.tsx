import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Promotions' };

export default function AdminPromotionsPage() {
  return <AdminResourceClient resource="promotions" />;
}
