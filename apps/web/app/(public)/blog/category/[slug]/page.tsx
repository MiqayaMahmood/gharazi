import type { Metadata } from 'next';
import { BlogCard } from '@/components/content/blog-card';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { EmptyState } from '@/components/ui/state';
import { listBlogPosts } from '@/lib/api/wordpress';
import { createMetadata } from '@/lib/seo/metadata';
import { readableSlug } from '@/lib/seo/seo-templates';

export const revalidate = 600;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const name = readableSlug(slug); return createMetadata({ title: `${name} Property Guides`, description: `Read Gharazi guides about ${name.toLowerCase()}, property decisions and safer real-estate research.`, path: `/blog/category/${slug}` }); }
export default async function BlogCategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const result = await listBlogPosts({ categorySlug: slug, perPage: 24 }).catch(() => ({ posts: [] })); const name = readableSlug(slug); return <main className="mx-auto max-w-7xl px-4 py-10"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: name }]} /><h1 className="text-4xl font-black">{name} property guides</h1><p className="mt-3 text-muted">Practical WordPress-powered guidance for property research and safer decisions.</p>{result.posts.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{result.posts.map((post) => <BlogCard key={post.id} post={post} />)}</div> : <div className="mt-8"><EmptyState title="No guides in this category yet" message="New related articles will appear here automatically." /></div>}</main>; }
