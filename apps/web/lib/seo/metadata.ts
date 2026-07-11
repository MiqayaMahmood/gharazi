import type { Metadata } from 'next';
import { canonicalPath, absoluteUrl } from './canonical';

export function createMetadata(input: { title: string; description: string; path: string; image?: string; type?: 'website' | 'article'; noIndex?: boolean }): Metadata {
  const canonical = canonicalPath(input.path); const image = input.image ? absoluteUrl(input.image) : undefined;
  return {
    title: input.title, description: input.description, alternates: { canonical }, robots: input.noIndex ? { index: false, follow: false } : undefined,
    openGraph: { title: input.title, description: input.description, url: absoluteUrl(canonical), siteName: 'Gharazi', type: input.type ?? 'website', images: image ? [{ url: image, alt: input.title }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: input.title, description: input.description, images: image ? [image] : undefined },
  };
}
