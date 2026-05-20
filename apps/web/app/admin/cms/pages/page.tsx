import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin CMS Pages' };

export default function AdminCmsPagesPage() {
  return <AdminResourceClient resource="cms-pages" />;
}
