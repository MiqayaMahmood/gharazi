export type AdvertisingAudience = 'individuals' | 'agencies' | 'developers' | 'sponsored';

export type AdvertisingPackage = {
  id: string;
  audience: AdvertisingAudience;
  name: string;
  priceLabel: string;
  billingLabel?: string;
  badge?: string;
  bestFor: string;
  ctaLabel: string;
  features: string[];
};

export type SponsoredPlacement = {
  id: string;
  name: string;
  location: string;
  bestUse: string;
  creativeSize: string;
  availability: string;
};

export const audienceLabels: Record<AdvertisingAudience, string> = {
  individuals: 'Individuals',
  agencies: 'Agencies',
  developers: 'Developers',
  sponsored: 'Sponsored Ads',
};

export const advertisingPackages: AdvertisingPackage[] = [
  {
    id: 'basic-listing-boost',
    audience: 'individuals',
    name: 'Basic Listing Boost',
    priceLabel: 'Starting price TBD',
    billingLabel: '30-day visibility boost',
    bestFor: 'Owners who want more serious views without managing a full campaign.',
    ctaLabel: 'Request boost',
    features: ['Promoted listing treatment', 'Higher search visibility', 'Inquiry CTA highlight', 'Basic performance summary'],
  },
  {
    id: 'hot-listing',
    audience: 'individuals',
    name: 'Hot Listing',
    priceLabel: 'Contact sales',
    billingLabel: 'Priority exposure window',
    badge: 'High intent',
    bestFor: 'Sellers and landlords who need stronger exposure in active searches.',
    ctaLabel: 'Ask about Hot Listing',
    features: ['Priority result placement', 'Highlighted card treatment', 'Chat-ready lead capture', 'Freshness refresh support'],
  },
  {
    id: 'super-hot-listing',
    audience: 'individuals',
    name: 'Super Hot Listing',
    priceLabel: 'Contact sales',
    billingLabel: 'Premium listing campaign',
    badge: 'Maximum visibility',
    bestFor: 'Premium homes, urgent deals, and inventory that needs top placement.',
    ctaLabel: 'Discuss Super Hot',
    features: ['Top placement windows', 'Premium visibility badge', 'Homepage/search eligibility', 'Enhanced analytics visibility'],
  },
  {
    id: 'refresh-credits',
    audience: 'individuals',
    name: 'Refresh Credits',
    priceLabel: 'Bundle pricing TBD',
    billingLabel: 'Credit-based add-on',
    bestFor: 'Owners who want to keep active listings fresh without reposting.',
    ctaLabel: 'Request credits',
    features: ['Refresh listing timestamp', 'Improve recency visibility', 'Use across eligible listings', 'Simple credit tracking'],
  },
  {
    id: 'starter-agency',
    audience: 'agencies',
    name: 'Starter Agency',
    priceLabel: 'Contact sales',
    bestFor: 'Small agencies building a verified presence.',
    ctaLabel: 'Start agency plan',
    features: ['Starter listing quota', 'Agency profile page', 'Verified agency badge eligibility', 'Shared lead inbox'],
  },
  {
    id: 'growth-agency',
    audience: 'agencies',
    name: 'Growth Agency',
    priceLabel: 'Contact sales',
    badge: 'Most popular',
    bestFor: 'Growing teams that need regular visibility and lead flow.',
    ctaLabel: 'Request Growth plan',
    features: ['Expanded listing quota', 'Hot listing credits', 'Refresh credit bundle', 'Lead and response analytics', 'Priority approval lane'],
  },
  {
    id: 'premium-agency',
    audience: 'agencies',
    name: 'Premium Agency',
    priceLabel: 'Custom quote',
    bestFor: 'Established agencies competing across multiple areas.',
    ctaLabel: 'Talk to sales',
    features: ['Large listing quota', 'Hot and Super Hot credits', 'Featured agency card eligibility', 'Premium profile trust signals', 'Campaign performance reporting'],
  },
  {
    id: 'elite-agency',
    audience: 'agencies',
    name: 'Elite Agency',
    priceLabel: 'Custom quote',
    badge: 'Best for market leaders',
    bestFor: 'High-volume agencies that need premium placement and support.',
    ctaLabel: 'Build an Elite plan',
    features: ['Highest visibility bundle', 'Featured agency placement', 'Dedicated campaign support', 'City/area visibility options', 'Advanced dashboard reporting'],
  },
  {
    id: 'project-launch',
    audience: 'developers',
    name: 'Project Launch',
    priceLabel: 'Contact sales',
    bestFor: 'Developers preparing a new project for market visibility.',
    ctaLabel: 'Launch project',
    features: ['Developer profile page', 'Project page promotion', 'Payment plan display support', 'Inquiry and chat lead capture'],
  },
  {
    id: 'project-growth',
    audience: 'developers',
    name: 'Project Growth',
    priceLabel: 'Custom quote',
    badge: 'Investor ready',
    bestFor: 'Active projects that need sustained buyer and investor interest.',
    ctaLabel: 'Request Growth plan',
    features: ['Featured project placement', 'Project update visibility', 'Project spotlight slots', 'Lead source analytics', 'Investor-friendly decision cards'],
  },
  {
    id: 'brand-builder',
    audience: 'developers',
    name: 'Brand Builder',
    priceLabel: 'Custom quote',
    bestFor: 'Developers building long-term brand trust across markets.',
    ctaLabel: 'Discuss brand campaign',
    features: ['Featured developer placement', 'Leaderboard/banner options', 'Project portfolio visibility', 'Construction update highlights', 'Reporting cadence'],
  },
  {
    id: 'premium-developer',
    audience: 'developers',
    name: 'Premium Developer',
    priceLabel: 'Custom quote',
    badge: 'Premium',
    bestFor: 'Major builders launching or scaling multi-project campaigns.',
    ctaLabel: 'Build developer package',
    features: ['Premium developer profile', 'Multiple featured projects', 'Campaign placement bundle', 'High-intent inquiry flows', 'Dedicated support and reporting'],
  },
];

export const sponsoredPlacements: SponsoredPlacement[] = [
  { id: 'leaderboard', name: 'Leaderboard Banner', location: 'Top public page areas', bestUse: 'Brand awareness for agencies, banks, and developers.', creativeSize: 'Desktop wide banner; final specs TBD', availability: 'Limited inventory' },
  { id: 'homepage-middle', name: 'Homepage Middle Banner', location: 'Between discovery sections', bestUse: 'Campaign visibility without interrupting search.', creativeSize: 'Responsive banner', availability: 'Beta slots available' },
  { id: 'search-inline', name: 'Search Results Inline Banner', location: 'Listings or projects results', bestUse: 'Reach high-intent users while they compare options.', creativeSize: 'Native sponsored card', availability: 'By city/category' },
  { id: 'area-sponsorship', name: 'Area Page Sponsorship', location: 'City and area landing pages', bestUse: 'Own visibility in a target market or neighborhood.', creativeSize: 'Area sponsor block', availability: 'Market exclusive options planned' },
  { id: 'project-spotlight', name: 'Project Spotlight', location: 'Home, projects, and area surfaces', bestUse: 'Promote new developments with payment-plan clarity.', creativeSize: 'Project card/spotlight module', availability: 'Developer packages' },
  { id: 'featured-agency', name: 'Featured Agency Placement', location: 'Homepage and agency discovery sections', bestUse: 'Build trust and recognition for verified agencies.', creativeSize: 'Agency profile card', availability: 'Agency packages' },
  { id: 'email-campaign', name: 'Email / Newsletter Campaign', location: 'Future email digest', bestUse: 'Reach saved-search and guide readers when email is live.', creativeSize: 'Coming soon', availability: 'Planned' },
  { id: 'splash-campaign', name: 'Splash Campaign', location: 'High-impact campaign inventory', bestUse: 'Major launches and brand moments.', creativeSize: 'Coming soon', availability: 'Planned, controlled use only' },
];

export const advertisingFaqs = [
    ['How can I advertise my property on Gharazi?', 'Choose the package that fits your goal and submit the advertising inquiry form. Our team will confirm availability, pricing, and activation details.'],
    ['What types of properties can I promote?', 'Residential, rental, plot, commercial, and new-project inventory can be promoted when it meets Gharazi quality and verification rules.'],
  ['What is the difference between Hot and Super Hot listings?', 'Hot listings receive stronger result visibility. Super Hot listings are designed for maximum placement windows, premium treatment, and stronger campaign reporting.'],
  ['Can agencies promote multiple listings?', 'Yes. Agency packages are designed around listing quotas, promoted credits, refresh credits, verified profile visibility, and shared lead handling.'],
  ['Can developers promote new projects?', 'Yes. Developer packages focus on project pages, project spotlight placements, payment-plan clarity, project updates, and direct inquiry capture.'],
  ['What banner placements are available?', 'Leaderboard, homepage banner, search inline, area sponsorship, project spotlight, and featured agency placements are planned or available based on inventory.'],
    ['Do packages include leads or chat inquiries?', 'Packages improve visibility and route interested users into Gharazi inquiry and chat flows. Lead volume depends on market, inventory quality, and campaign scope.'],
  ['How long does a promoted listing stay active?', 'Most listing boosts are planned around 30-day windows, with exact duration confirmed in the selected package.'],
  ['Can I target a specific city or area?', 'Yes. City, area, and category targeting is supported for many sponsored placements when inventory and page traffic are available.'],
    ['How do I track campaign performance?', 'Gharazi dashboard and reporting surfaces can show visibility, inquiries, response activity, and campaign summaries as the product matures.'],
  ['Is payment online or handled by sales?', 'For beta, advertising is handled by sales. Full self-serve checkout is not part of this sprint.'],
  ['Can packages be customized?', 'Yes. Agencies and developers can request custom packages based on inventory, cities, launch timing, and campaign goals.'],
];
