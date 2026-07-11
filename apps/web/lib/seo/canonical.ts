export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function canonicalPath(path: string) {
  const clean = path.split('?')[0].split('#')[0];
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function absoluteUrl(path: string) { return /^https?:\/\//i.test(path) ? path : `${SITE_URL}${canonicalPath(path)}`; }
