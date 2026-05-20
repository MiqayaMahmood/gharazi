export type WpRendered = {
  rendered?: string;
};

export type WpCategory = {
  id: number;
  count?: number;
  description?: string;
  link?: string;
  name: string;
  parent: number;
  slug: string;
};

export type WpPost = {
  id: number;
  date: string;
  date_gmt?: string;
  slug: string;
  link?: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
  categories?: number[];
  author?: number;
  _embedded?: {
    author?: Array<{ id: number; name: string }>;
    'wp:featuredmedia'?: Array<{
      id: number;
      alt_text?: string;
      source_url?: string;
      media_details?: {
        sizes?: Record<string, { source_url?: string }>;
      };
    }>;
    'wp:term'?: Array<Array<WpCategory>>;
  };
};

export type WpComment = {
  id: number;
  post: number;
  author_name?: string;
  date: string;
  content: WpRendered;
};

export type BlogCategory = {
  id: number;
  name: string;
  slug: string;
  count?: number;
  parentId?: number;
};

export type BlogPostSummary = {
  id: string;
  wpId: number;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  publishedAt?: string;
  authorName?: string;
  categories: BlogCategory[];
};

export type BlogPostDetail = BlogPostSummary & {
  contentHtml: string;
  sourceUrl?: string;
};

export type BlogComment = {
  id: string;
  postId: number;
  authorName: string;
  contentHtml: string;
  createdAt?: string;
};

export type BlogSort = 'newest' | 'oldest' | 'az' | 'za';

export type BlogListResult = {
  posts: BlogPostSummary[];
  categories: BlogCategory[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};
