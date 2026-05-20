import { normalizeCategory, normalizeComment, normalizePostDetail, normalizePostSummary } from '@/lib/wordpress/normalizers';
import type { BlogCategory, BlogComment, BlogListResult, BlogPostDetail, BlogPostSummary, BlogSort, WpCategory, WpComment, WpPost } from '@/lib/wordpress/types';

const DEFAULT_WP_API_BASE = 'https://mydaytogo.com/wp-json/wp/v2';
const DEFAULT_MAIN_CATEGORY_SLUG = 'sweetnsavour';
const REVALIDATE_SECONDS = 600;

type ListPostsOptions = {
  page?: number;
  perPage?: number;
  categorySlug?: string;
  sort?: BlogSort;
  search?: string;
  excludePostId?: number;
};

export async function listBlogPosts(options: ListPostsOptions = {}): Promise<BlogListResult> {
  const page = Math.max(1, options.page ?? 1);
  const perPage = Math.min(24, Math.max(1, options.perPage ?? 9));
  const [mainCategory, childCategories] = await Promise.all([getMainBlogCategory(), getBlogCategories()]);
  const selectedCategory = options.categorySlug ? await getCategoryBySlug(options.categorySlug) : undefined;
  const categoryIds = selectedCategory
    ? [selectedCategory.id]
    : [mainCategory?.id, ...childCategories.map((category) => category.id)].filter((id): id is number => typeof id === 'number');

  if (categoryIds.length === 0) {
    return { posts: [], categories: childCategories, page, perPage, total: 0, totalPages: 1 };
  }

  const { orderby, order } = mapSort(options.sort);
  const params = new URLSearchParams({
    _embed: '1',
    page: String(page),
    per_page: String(perPage),
    categories: categoryIds.join(','),
    orderby,
    order,
  });
  if (options.search) params.set('search', options.search);
  if (options.excludePostId) params.set('exclude', String(options.excludePostId));

  const response = await wpFetch<WpPost[]>(`/posts?${params.toString()}`);
  return {
    posts: response.data.map(normalizePostSummary),
    categories: childCategories,
    page,
    perPage,
    total: parseHeaderNumber(response.headers, 'x-wp-total'),
    totalPages: Math.max(1, parseHeaderNumber(response.headers, 'x-wp-totalpages')),
  };
}

export async function listLatestBlogPosts(limit = 3): Promise<BlogPostSummary[]> {
  try {
    const result = await listBlogPosts({ perPage: limit, sort: 'newest' });
    return result.posts;
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPostDetail | null> {
  const params = new URLSearchParams({ slug, _embed: '1' });
  const response = await wpFetch<WpPost[]>(`/posts?${params.toString()}`);
  const post = response.data[0];
  return post ? normalizePostDetail(post) : null;
}

export async function getRelatedBlogPosts(post: BlogPostDetail, limit = 3): Promise<BlogPostSummary[]> {
  try {
    const categorySlug = post.categories[0]?.slug;
    const result = await listBlogPosts({ categorySlug, perPage: limit + 1, excludePostId: post.wpId });
    return result.posts.filter((item) => item.slug !== post.slug).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  try {
    const mainCategory = await getMainBlogCategory();
    if (!mainCategory) return [];
    const params = new URLSearchParams({ parent: String(mainCategory.id), per_page: '50', orderby: 'name', order: 'asc' });
    const response = await wpFetch<WpCategory[]>(`/categories?${params.toString()}`);
    return response.data.map(normalizeCategory);
  } catch {
    return [];
  }
}

export async function getBlogComments(postId: number): Promise<BlogComment[]> {
  try {
    const params = new URLSearchParams({ post: String(postId), status: 'approve', orderby: 'date', order: 'asc', per_page: '50' });
    const response = await wpFetch<WpComment[]>(`/comments?${params.toString()}`);
    return response.data.map(normalizeComment);
  } catch {
    return [];
  }
}

export async function submitBlogComment(input: { postId: number; name: string; email?: string; message: string }) {
  const payload = {
    post: input.postId,
    author_name: input.name,
    author_email: input.email,
    content: input.message,
  };
  await wpFetch<WpComment>('/comments', {
    method: 'POST',
    body: JSON.stringify(payload),
    cache: 'no-store',
    useApiKey: true,
  });
}

async function getMainBlogCategory(): Promise<BlogCategory | null> {
  const slug = process.env.WP_MAIN_CATEGORY_SLUG || DEFAULT_MAIN_CATEGORY_SLUG;
  const category = await getCategoryBySlug(slug);
  return category ?? null;
}

async function getCategoryBySlug(slug: string): Promise<BlogCategory | undefined> {
  const params = new URLSearchParams({ slug });
  const response = await wpFetch<WpCategory[]>(`/categories?${params.toString()}`);
  const category = response.data[0];
  return category ? normalizeCategory(category) : undefined;
}

async function wpFetch<T>(path: string, options: RequestInit & { useApiKey?: boolean } = {}): Promise<{ data: T; headers: Headers }> {
  const url = `${getWpApiBase()}${path}`;
  const { useApiKey, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (useApiKey && process.env.WP_API_KEY) headers.set('Authorization', `Bearer ${process.env.WP_API_KEY}`);

  const response = await fetch(url, {
    ...requestOptions,
    headers,
    next: options.cache === 'no-store' ? undefined : { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`WordPress request failed: ${response.status}`);
  return { data: (await response.json()) as T, headers: response.headers };
}

function getWpApiBase() {
  return (process.env.WP_API_BASE || process.env.NEXT_PUBLIC_WP_API_BASE || DEFAULT_WP_API_BASE).replace(/\/$/, '');
}

function mapSort(sort: BlogSort = 'newest') {
  if (sort === 'oldest') return { orderby: 'date', order: 'asc' };
  if (sort === 'az') return { orderby: 'title', order: 'asc' };
  if (sort === 'za') return { orderby: 'title', order: 'desc' };
  return { orderby: 'date', order: 'desc' };
}

function parseHeaderNumber(headers: Headers, key: string) {
  const value = headers.get(key);
  const parsed = value ? Number.parseInt(value, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
