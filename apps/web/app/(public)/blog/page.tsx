import type { Metadata } from 'next';
import { BlogCard } from '@/components/content/blog-card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { listBlogPosts } from '@/lib/api/wordpress';
import type { BlogListResult, BlogSort } from '@/lib/wordpress/types';
import { createMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = createMetadata({ title: 'Pakistan Real Estate Guides and Insights', description: 'WordPress-powered Pakistan property guides for buyers, renters, investors and new-project research.', path: '/blog' });

type BlogSearchParams = {
  page?: string;
  category?: string;
  sort?: BlogSort;
  q?: string;
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<BlogSearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const sort = params.sort ?? 'newest';
  const category = params.category;
  const query = params.q?.trim();
  const result = await safeListBlogPosts({ page, categorySlug: category, sort, search: query });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wide text-trust">Gharazi insights</p>
        <h1 className="mt-2 text-4xl font-black">Real estate guides</h1>
        <p className="mt-3 text-lg text-muted">Practical WordPress-powered guides for verified listings, project payment plans, area selection, and safer property decisions.</p>
      </div>

      <form className="mt-8 grid gap-3 rounded-xl border border-line bg-white p-4 shadow-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]" action="/blog">
        <label className="grid gap-1 text-sm font-semibold">
          Search
          <Input name="q" defaultValue={query} placeholder="Search guides" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Category
          <Select name="category" defaultValue={category ?? ''}>
            <option value="">All real estate</option>
            {result.categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Sort
          <Select name="sort" defaultValue={sort}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A to Z</option>
            <option value="za">Z to A</option>
          </Select>
        </label>
        <div className="flex items-end">
          <Button className="w-full">Apply</Button>
        </div>
      </form>

      {result.posts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-stone-50 p-8">
          <h2 className="text-xl font-black">No guides found</h2>
          <p className="mt-2 text-muted">WordPress content may be unavailable, or no posts match the selected filters.</p>
          <Button asChild href="/blog" className="mt-4" variant="secondary">Clear filters</Button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{result.posts.map((post) => <BlogCard key={post.id} post={post} />)}</div>
          <BlogPagination result={result} params={params} />
        </>
      )}
    </div>
  );
}

function BlogPagination({ result, params }: { result: BlogListResult; params: BlogSearchParams }) {
  const previous = result.page > 1 ? buildPageHref(params, result.page - 1) : undefined;
  const next = result.page < result.totalPages ? buildPageHref(params, result.page + 1) : undefined;
  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Blog pagination">
      <span className="text-sm text-muted">Page {result.page} of {result.totalPages}</span>
      <div className="flex gap-2">
        {previous ? <Button asChild href={previous} variant="secondary">Previous</Button> : <Button variant="secondary" disabled>Previous</Button>}
        {next ? <Button asChild href={next} variant="secondary">Next</Button> : <Button variant="secondary" disabled>Next</Button>}
      </div>
    </nav>
  );
}

function buildPageHref(params: BlogSearchParams, page: number) {
  const next = new URLSearchParams();
  if (params.q) next.set('q', params.q);
  if (params.category) next.set('category', params.category);
  if (params.sort) next.set('sort', params.sort);
  next.set('page', String(page));
  return `/blog?${next.toString()}`;
}

async function safeListBlogPosts(options: Parameters<typeof listBlogPosts>[0]) {
  try {
    return await listBlogPosts(options);
  } catch {
    return { posts: [], categories: [], page: options?.page ?? 1, perPage: 9, total: 0, totalPages: 1 };
  }
}
