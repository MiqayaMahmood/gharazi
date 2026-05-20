import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogComments } from '@/components/content/blog-comments';
import { BlogCard } from '@/components/content/blog-card';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BlogDisclaimer } from '@/components/legal/disclaimers';
import { getBlogComments, getBlogPost, getRelatedBlogPosts } from '@/lib/api/wordpress';
import { formatDate } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug).catch(() => null);
  if (!post) return { title: 'Guide not found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug).catch(() => null);
  if (!post) notFound();
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/blog/${post.slug}`;
  const [relatedPosts, comments] = await Promise.all([getRelatedBlogPosts(post), getBlogComments(post.wpId)]);

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <ViewTracker eventType="blog_viewed" entityType="blog" metadataJson={{ slug: post.slug, wpId: post.wpId }} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Guide</Badge>
        {post.categories.slice(0, 2).map((category) => <Badge key={category.id}>{category.name}</Badge>)}
      </div>
      <h1 className="mt-4 text-4xl font-black">{post.title}</h1>
      <p className="mt-3 text-muted">{formatDate(post.publishedAt)} - {post.authorName ?? 'Gharazieditorial'}</p>
      {post.coverImageUrl ? (
        <div className="relative mt-6 aspect-[16/8] overflow-hidden rounded-xl bg-stone-200">
          <Image src={post.coverImageUrl} alt={post.coverImageAlt ?? ''} fill className="object-cover" priority sizes="(min-width: 1024px) 896px, 100vw" />
        </div>
      ) : null}
      <div className="prose prose-stone mt-8 max-w-none">
        {post.excerpt ? <p className="text-lg leading-8 text-muted">{post.excerpt}</p> : null}
        <div className="leading-8 text-ink" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </div>
      <BlogDisclaimer className="mt-8" />

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild href="/blog" variant="secondary">Back to blog</Button>
        <Button asChild href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`} variant="ghost">Share</Button>
      </div>

      <BlogComments postId={post.wpId} comments={comments} />

      <Card className="mt-10 p-5">
        <h2 className="text-xl font-black">Related guides</h2>
        {relatedPosts.length === 0 ? <p className="mt-2 text-sm text-muted">Related WordPress posts will appear here when available.</p> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-3">{relatedPosts.map((item) => <BlogCard key={item.id} post={item} />)}</div>
        <div className="mt-4">
          <Link className="text-sm font-bold text-trust" href="/blog">View all guides</Link>
        </div>
      </Card>
    </article>
  );
}
