import { apiRequest } from './client';
import { readWithFallback } from './mock-fallback';
import { mockBlogPosts } from '@/lib/mock-data';
import type { BlogPost } from '@/types/cms';

export function listBlogPosts() {
  return readWithFallback(apiRequest<BlogPost[]>('/cms/blog-posts'), mockBlogPosts, 'cms blog posts');
}

export function getBlogPost(slug: string) {
  return readWithFallback(apiRequest<BlogPost>(`/cms/blog-posts/${slug}`), mockBlogPosts.find((post) => post.slug === slug) ?? mockBlogPosts[0], 'cms blog post');
}
