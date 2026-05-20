import type { MetadataRoute } from 'next';
import { mockAreas, mockListings, mockProjects } from '@/lib/mock-data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/buy', '/rent', '/projects', '/blog', '/advertise', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer', '/anti-spam-policy', '/platform-neutrality', '/advertising-disclaimer', '/cookie-policy', '/compare/listings', '/compare/projects'].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));
  return [
    ...staticRoutes,
    ...mockListings.map((listing) => ({ url: `${siteUrl}/listing/${listing.publicId}`, lastModified: listing.updatedAt ? new Date(listing.updatedAt) : new Date() })),
    ...mockProjects.map((project) => ({ url: `${siteUrl}/project/${project.slug}`, lastModified: new Date() })),
    ...mockAreas.map((area) => ({ url: `${siteUrl}/area/${area.slug}`, lastModified: new Date() })),
  ];
}
