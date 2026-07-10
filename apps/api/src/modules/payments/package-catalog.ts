export type PackageType = 'one_time' | 'subscription';
export type PackageEntityType = 'listing' | 'project' | 'agency' | 'developer' | 'banner' | 'none';

export type MonetizationPackage = {
  code: string;
  name: string;
  description: string;
  type: PackageType;
  audience: 'individual' | 'company' | 'developer' | 'agency';
  amount: number;
  priceLabel: string;
  stripePriceId?: string;
  durationDays?: number;
  entitlements: string[];
  requiresEntityType: PackageEntityType;
  active: boolean;
};

const pkg = (value: Omit<MonetizationPackage, 'stripePriceId'> & { priceEnv: string }): MonetizationPackage => ({
  ...value,
  stripePriceId: process.env[value.priceEnv],
});

export function getPackageCatalog(): MonetizationPackage[] {
  return [
    pkg({ code: 'listing_boost_basic', name: 'Listing Boost', description: 'Refresh and promote a listing for 7 days.', type: 'one_time', audience: 'individual', amount: 2500, priceLabel: 'PKR 2,500', priceEnv: 'STRIPE_PRICE_LISTING_BOOST_BASIC', durationDays: 7, entitlements: ['listing_refresh', 'promotion'], requiresEntityType: 'listing', active: true }),
    pkg({ code: 'listing_hot', name: 'Hot Listing', description: 'Show a Hot badge for 14 days.', type: 'one_time', audience: 'individual', amount: 5000, priceLabel: 'PKR 5,000', priceEnv: 'STRIPE_PRICE_LISTING_HOT', durationDays: 14, entitlements: ['listing_hot'], requiresEntityType: 'listing', active: true }),
    pkg({ code: 'listing_super_hot', name: 'Super Hot Listing', description: 'Hot and featured listing placement for 30 days.', type: 'one_time', audience: 'individual', amount: 9000, priceLabel: 'PKR 9,000', priceEnv: 'STRIPE_PRICE_LISTING_SUPER_HOT', durationDays: 30, entitlements: ['listing_hot', 'listing_featured'], requiresEntityType: 'listing', active: true }),
    pkg({ code: 'project_spotlight', name: 'Project Spotlight', description: 'Spotlight placement for a project.', type: 'one_time', audience: 'developer', amount: 25000, priceLabel: 'PKR 25,000', priceEnv: 'STRIPE_PRICE_PROJECT_SPOTLIGHT', durationDays: 30, entitlements: ['project_spotlight'], requiresEntityType: 'project', active: true }),
    pkg({ code: 'project_featured', name: 'Featured Project', description: 'Featured project visibility for 30 days.', type: 'one_time', audience: 'developer', amount: 18000, priceLabel: 'PKR 18,000', priceEnv: 'STRIPE_PRICE_PROJECT_FEATURED', durationDays: 30, entitlements: ['project_featured'], requiresEntityType: 'project', active: true }),
    pkg({ code: 'developer_project_launch', name: 'Developer Project Launch', description: 'Structured launch campaign record.', type: 'one_time', audience: 'developer', amount: 75000, priceLabel: 'PKR 75,000', priceEnv: 'STRIPE_PRICE_DEVELOPER_PROJECT_LAUNCH', durationDays: 30, entitlements: ['project_featured', 'project_launch'], requiresEntityType: 'project', active: true }),
    pkg({ code: 'agency_starter_monthly', name: 'Agency Starter', description: 'Starter agency subscription.', type: 'subscription', audience: 'agency', amount: 10000, priceLabel: 'PKR 10,000/month', priceEnv: 'STRIPE_PRICE_AGENCY_STARTER_MONTHLY', entitlements: ['agency_subscription'], requiresEntityType: 'agency', active: true }),
    pkg({ code: 'agency_growth_monthly', name: 'Agency Growth', description: 'Growth agency subscription.', type: 'subscription', audience: 'agency', amount: 25000, priceLabel: 'PKR 25,000/month', priceEnv: 'STRIPE_PRICE_AGENCY_GROWTH_MONTHLY', entitlements: ['agency_subscription', 'premium_badge'], requiresEntityType: 'agency', active: true }),
    pkg({ code: 'agency_premium_monthly', name: 'Agency Premium', description: 'Premium agency subscription.', type: 'subscription', audience: 'agency', amount: 50000, priceLabel: 'PKR 50,000/month', priceEnv: 'STRIPE_PRICE_AGENCY_PREMIUM_MONTHLY', entitlements: ['agency_subscription', 'premium_badge'], requiresEntityType: 'agency', active: true }),
    pkg({ code: 'developer_starter_monthly', name: 'Developer Starter', description: 'Starter developer subscription.', type: 'subscription', audience: 'developer', amount: 30000, priceLabel: 'PKR 30,000/month', priceEnv: 'STRIPE_PRICE_DEVELOPER_STARTER_MONTHLY', entitlements: ['developer_subscription'], requiresEntityType: 'developer', active: true }),
    pkg({ code: 'developer_premium_monthly', name: 'Developer Premium', description: 'Premium developer subscription.', type: 'subscription', audience: 'developer', amount: 75000, priceLabel: 'PKR 75,000/month', priceEnv: 'STRIPE_PRICE_DEVELOPER_PREMIUM_MONTHLY', entitlements: ['developer_subscription', 'premium_badge'], requiresEntityType: 'developer', active: true }),
    pkg({ code: 'homepage_banner', name: 'Homepage Banner', description: 'Homepage advertising placement pending creative approval.', type: 'one_time', audience: 'company', amount: 100000, priceLabel: 'PKR 100,000', priceEnv: 'STRIPE_PRICE_HOMEPAGE_BANNER', durationDays: 30, entitlements: ['homepage_banner'], requiresEntityType: 'banner', active: true }),
    pkg({ code: 'search_inline_ad', name: 'Search Inline Ad', description: 'Sponsored search placement.', type: 'one_time', audience: 'company', amount: 60000, priceLabel: 'PKR 60,000', priceEnv: 'STRIPE_PRICE_SEARCH_INLINE_AD', durationDays: 30, entitlements: ['search_inline_ad'], requiresEntityType: 'banner', active: true }),
    pkg({ code: 'area_sponsorship', name: 'Area Sponsorship', description: 'Sponsored area placement.', type: 'one_time', audience: 'company', amount: 150000, priceLabel: 'PKR 150,000', priceEnv: 'STRIPE_PRICE_AREA_SPONSORSHIP', durationDays: 30, entitlements: ['area_sponsorship'], requiresEntityType: 'banner', active: true }),
    pkg({ code: 'featured_agency', name: 'Featured Agency', description: 'Featured agency placement.', type: 'one_time', audience: 'agency', amount: 45000, priceLabel: 'PKR 45,000', priceEnv: 'STRIPE_PRICE_FEATURED_AGENCY', durationDays: 30, entitlements: ['featured_agency'], requiresEntityType: 'agency', active: true }),
    pkg({ code: 'featured_developer', name: 'Featured Developer', description: 'Featured developer placement.', type: 'one_time', audience: 'developer', amount: 60000, priceLabel: 'PKR 60,000', priceEnv: 'STRIPE_PRICE_FEATURED_DEVELOPER', durationDays: 30, entitlements: ['featured_developer'], requiresEntityType: 'developer', active: true }),
  ];
}

export function findPackage(code: string) {
  return getPackageCatalog().find((item) => item.code === code);
}
