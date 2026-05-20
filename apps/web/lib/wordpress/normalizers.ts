import type { BlogCategory, BlogComment, BlogPostDetail, BlogPostSummary, WpCategory, WpComment, WpPost } from './types';

export function normalizeCategory(category: WpCategory): BlogCategory {
  return {
    id: category.id,
    name: decodeHtml(stripHtml(category.name)),
    slug: category.slug,
    count: category.count,
    parentId: category.parent || undefined,
  };
}

export function normalizePostSummary(post: WpPost): BlogPostSummary {
  const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
  const categories = extractCategories(post);
  return {
    id: String(post.id),
    wpId: post.id,
    title: decodeHtml(stripHtml(post.title?.rendered ?? 'Untitled guide')),
    slug: post.slug,
    excerpt: decodeHtml(stripHtml(post.excerpt?.rendered ?? '')).trim(),
    coverImageUrl: featuredMedia?.media_details?.sizes?.medium_large?.source_url ?? featuredMedia?.source_url,
    coverImageAlt: featuredMedia?.alt_text ? decodeHtml(stripHtml(featuredMedia.alt_text)) : undefined,
    publishedAt: post.date,
    authorName: post._embedded?.author?.[0]?.name,
    categories,
  };
}

export function normalizePostDetail(post: WpPost): BlogPostDetail {
  return {
    ...normalizePostSummary(post),
    contentHtml: enhanceWordPressHtml(sanitizeHtml(post.content?.rendered ?? '')),
    sourceUrl: post.link,
  };
}

export function normalizeComment(comment: WpComment): BlogComment {
  return {
    id: String(comment.id),
    postId: comment.post,
    authorName: decodeHtml(stripHtml(comment.author_name ?? 'Reader')),
    contentHtml: sanitizeHtml(comment.content?.rendered ?? ''),
    createdAt: comment.date,
  };
}

export function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*data:text\/html[\s\S]*?\2/gi, '');
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

function extractCategories(post: WpPost) {
  const terms = post._embedded?.['wp:term'] ?? [];
  return terms.flat().filter((term): term is WpCategory => Boolean(term?.id && term.slug)).map(normalizeCategory);
}

function enhanceWordPressHtml(html: string) {
  return html
    .replace(/<img /g, '<img class="h-auto max-w-full rounded-lg" loading="lazy" ')
    .replace(/<table/g, '<div class="overflow-x-auto"><table')
    .replace(/<\/table>/g, '</table></div>');
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    hellip: '...',
    lsquo: "'",
    mdash: '-',
    nbsp: ' ',
    ndash: '-',
    quot: '"',
    rsquo: "'",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const radix = entity[1]?.toLowerCase() === 'x' ? 16 : 10;
      const number = Number.parseInt(entity.replace(/^#x?/i, ''), radix);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}
