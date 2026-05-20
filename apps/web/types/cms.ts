export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentJson?: unknown;
  coverImageUrl?: string;
  publishedAt?: string;
  authorUserId?: string;
};
