import { AdminResourceClient } from '@/components/admin/admin-resource-client';

export const metadata = { title: 'Admin Blog Posts' };

export default function AdminBlogPostsPage() {
  return <AdminResourceClient resource="blog-posts" />;
}
