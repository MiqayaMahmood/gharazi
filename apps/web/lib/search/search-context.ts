export type SearchLandingContext = {
  purpose: 'sale' | 'rent' | 'project';
  citySlug?: string;
  cityName?: string;
  propertyTypeCode?: string;
  propertyTypeName?: string;
  category?: 'residential' | 'plot' | 'commercial' | 'industrial' | 'project';
};

const commercialTypes = new Set(['commercial', 'shop', 'office', 'warehouse', 'factory', 'building', 'commercial-plot']);
const plotTypes = new Set(['plot', 'residential-plot', 'commercial-plot']);

export function categoryForPropertyType(code?: string): SearchLandingContext['category'] {
  if (!code) return 'residential';
  if (plotTypes.has(code)) return 'plot';
  if (commercialTypes.has(code)) return 'commercial';
  return 'residential';
}

export function readableSlug(value?: string) {
  if (!value) return '';
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function searchLandingTitle(context: SearchLandingContext) {
  const city = context.cityName ? ` in ${context.cityName}` : ' in Pakistan';
  if (context.purpose === 'project') return context.cityName ? `New Projects in ${context.cityName}` : 'New and Upcoming Projects';
  if (context.propertyTypeName) return `${context.propertyTypeName} for ${context.purpose === 'rent' ? 'Rent' : 'Sale'}${city}`;
  return context.purpose === 'rent' ? `Properties for Rent${city}` : `Properties for Sale${city}`;
}

export function searchLandingSubtitle(context: SearchLandingContext) {
  if (context.purpose === 'project') return 'Discover developers, payment plans, possession status, legal signals, and project updates before you inquire.';
  if (context.category === 'plot') return 'Explore residential and commercial plots with area context, verification signals, and comparison tools.';
  if (context.category === 'commercial') return 'Find shops, offices, warehouses, and commercial opportunities with clearer filters and direct inquiry paths.';
  if (context.purpose === 'rent') return 'Find homes, apartments, offices, and shops with fresh updates, saved searches, and safer inquiry options.';
  return 'Explore verified homes, plots, apartments, and commercial properties with useful discovery tools and trust signals.';
}
