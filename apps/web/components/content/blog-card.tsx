import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BlogPostSummary } from '@/lib/wordpress/types';
import { formatDate } from '@/lib/utils';
import type { BlogPost } from '@/types/cms';

type BlogCardPost = BlogPost | BlogPostSummary;

export function BlogCard({ post }: { post: BlogCardPost }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/9] bg-stone-200">
        {post.coverImageUrl ? <Image src={post.coverImageUrl} alt={'coverImageAlt' in post ? post.coverImageAlt ?? '' : ''} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /> : null}
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
          <span>{formatDate(post.publishedAt)}</span>
          {'categories' in post && post.categories[0] ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-trust">{post.categories[0].name}</span> : null}
        </div>
        <h2 className="text-lg font-black">{post.title}</h2>
        <p className="text-sm text-muted">{post.excerpt}</p>
        <Button asChild href={`/blog/${post.slug}`} variant="secondary">Read guide</Button>
      </div>
    </Card>
  );
}

export function RelatedGuides({ posts }: { posts: BlogCardPost[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black">Related guides</h2>
      <p className="mt-2 text-muted">Helpful reading for safer decisions and better shortlists.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">{posts.slice(0, 3).map((post) => <BlogCard key={post.id} post={post} />)}</div>
    </section>
  );
}
