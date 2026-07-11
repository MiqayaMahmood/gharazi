import type { MetadataRoute } from 'next';
import { listAreas, listCities, listPropertyTypes } from '@/lib/api/reference';
import { searchListings, searchProjects } from '@/lib/api/marketplace';
import { listBlogPosts } from '@/lib/api/wordpress';
import { SITE_URL } from '@/lib/seo/canonical';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = ['', '/buy', '/rent', '/projects', '/blog', '/advertise', '/help', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer', '/anti-spam-policy', '/platform-neutrality', '/advertising-disclaimer', '/cookie-policy'];
  const [cities, propertyTypes, listings, projects, blog] = await Promise.all([
    listCities().catch(() => []), listPropertyTypes().catch(() => []),
    loadAllListings(), loadAllProjects(),
    listBlogPosts({ perPage: 24, sort: 'newest' }).catch(() => ({ posts: [], categories: [], page: 1, perPage: 24, total: 0, totalPages: 1 })),
  ]);
  const areas = (await Promise.all(cities.map((city) => listAreas(city.id).catch(() => [])))).flat();
  const entry = (path: string, lastModified: Date | string = now, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency: 'daily', priority });
  const routes = [
    ...staticPaths.map((path) => entry(path, now, path === '' ? 1 : 0.7)),
    ...cities.flatMap((city) => city.slug ? [entry(`/buy/${city.slug}`), entry(`/rent/${city.slug}`), entry(`/projects/${city.slug}`)] : []),
    ...propertyTypes.flatMap((type) => type.code ? [entry(`/buy/${type.code}`), ...cities.slice(0, 10).flatMap((city) => city.slug ? [entry(`/buy/${type.code}/${city.slug}`, now, 0.65)] : [])] : []),
    ...areas.flatMap((area) => area.slug ? [entry(`/area/${area.slug}`)] : []),
    ...listings.filter((item) => item.publicId).map((item) => entry(`/listing/${item.publicId}`, item.updatedAt ?? now, 0.8)),
    ...projects.filter((item) => item.slug).map((item) => entry(`/project/${item.slug}`, now, 0.8)),
    ...blog.posts.map((post) => entry(`/blog/${post.slug}`, post.publishedAt ?? now, 0.7)),
    ...blog.categories.map((category) => entry(`/blog/category/${category.slug}`, now, 0.6)),
  ];
  return Array.from(new Map(routes.map((item) => [item.url, item])).values());
}

async function loadAllListings() {
  const first = await searchListings({ sort: 'newest', limit: 100, page: 1 }).catch(() => ({ items: [], total: 0 }));
  const totalPages = Math.min(500, Math.ceil(first.total / 100));
  if (totalPages <= 1) return first.items;
  const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => searchListings({ sort: 'newest', limit: 100, page: index + 2 }).then((x) => x.items).catch(() => [])));
  return [first.items, ...rest].flat();
}

async function loadAllProjects() {
  const first = await searchProjects({ sort: 'newest', limit: 100, page: 1 }).catch(() => ({ items: [], total: 0 }));
  const totalPages = Math.min(500, Math.ceil(first.total / 100));
  if (totalPages <= 1) return first.items;
  const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => searchProjects({ sort: 'newest', limit: 100, page: index + 2 }).then((x) => x.items).catch(() => [])));
  return [first.items, ...rest].flat();
}
