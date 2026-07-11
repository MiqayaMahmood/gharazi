import type { BreadcrumbDataItem } from './structured-data';
export const searchBreadcrumbs = (section: 'Buy' | 'Rent' | 'Projects', city?: string, propertyType?: string): BreadcrumbDataItem[] => [{ label: 'Home', href: '/' }, { label: section, href: `/${section.toLowerCase()}` }, ...(city ? [{ label: city }] : []), ...(propertyType ? [{ label: propertyType }] : [])];
