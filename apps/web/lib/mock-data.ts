import type { AreaSuggestion, Listing, Project, SearchResponse } from '@/types/marketplace';
import type { ChatMessage, ChatThread, Favorite, Inquiry, Notification, SavedSearch } from '@/types/engagement';
import type { ReferenceItem } from '@/types/reference';
import type { BlogPost } from '@/types/cms';

export const mockListings: Listing[] = [
  {
    id: 'lst-1',
    publicId: 'HG-LHE-1001',
    title: 'Verified 10 Marla house near park',
    description: 'A well-kept family home with bright rooms, covered parking, and direct access to daily amenities.',
    priceAmount: 48500000,
    cityName: 'Lahore',
    areaName: 'DHA Phase 6',
    propertyTypeName: 'House',
    purposeSlug: 'Buy',
    bedrooms: 4,
    bathrooms: 5,
    areaValue: 10,
    areaUnit: 'marla',
    coverImageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    verificationStatus: 'verified',
    isFeatured: true,
    updatedAt: '2026-04-28T10:00:00.000Z',
    amenities: [
      { code: 'servant-quarter', slug: 'servant-quarter', name: 'Servant quarter' },
      { code: 'near-park', slug: 'near-park', name: 'Near park' },
      { code: 'secure-street', slug: 'secure-street', name: 'Secure street' },
      { code: 'gas-available', slug: 'gas-available', name: 'Gas available' },
    ],
    listerName: 'Adeel Khan',
    listerRole: 'Verified agent',
  },
  {
    id: 'lst-2',
    publicId: 'HG-KHI-2204',
    title: 'Sea-facing apartment with managed building',
    description: 'Modern apartment in a serviced building with lift, standby power, and secure lobby access.',
    priceAmount: 32500000,
    cityName: 'Karachi',
    areaName: 'Clifton Block 2',
    propertyTypeName: 'Apartment',
    purposeSlug: 'Buy',
    bedrooms: 3,
    bathrooms: 3,
    areaValue: 1800,
    areaUnit: 'sq ft',
    coverImageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    verificationStatus: 'verified',
    updatedAt: '2026-04-30T12:00:00.000Z',
    amenities: [
      { code: 'lift', slug: 'lift', name: 'Lift' },
      { code: 'standby-power', slug: 'standby-power', name: 'Standby power' },
      { code: 'covered-parking', slug: 'covered-parking', name: 'Covered parking' },
      { code: 'security', slug: 'security', name: 'Security' },
    ],
    listerName: 'Sana Properties',
    listerRole: 'Agency',
  },
  {
    id: 'lst-3',
    publicId: 'HG-ISB-3007',
    title: 'Corner plot with possession available',
    description: 'Ready possession plot on a developed street with clean transfer and nearby commercial access.',
    priceAmount: 21000000,
    cityName: 'Islamabad',
    areaName: 'G-13',
    propertyTypeName: 'Residential Plot',
    purposeSlug: 'Buy',
    areaValue: 8,
    areaUnit: 'marla',
    coverImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    updatedAt: '2026-04-22T09:00:00.000Z',
    amenities: [
      { code: 'possession', slug: 'possession', name: 'Possession' },
      { code: 'corner', slug: 'corner', name: 'Corner' },
      { code: 'developed-road', slug: 'developed-road', name: 'Developed road' },
    ],
    listerName: 'Owner listed',
    listerRole: 'Owner',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'prj-1',
    slug: 'green-view-residences-lahore',
    name: 'Green View Residences',
    developerName: 'Nexus Developers',
    cityName: 'Lahore',
    areaName: 'Raiwind Road',
    projectTypeName: 'Apartments',
    possessionStatus: 'Under construction',
    legalStatus: 'Approved',
    verificationStatus: 'verified',
    minPriceAmount: 8500000,
    maxPriceAmount: 24500000,
    coverImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    description: 'A gated vertical community with published construction updates, documented approvals, and installment plans.',
    launchDate: '2025-11-01',
    expectedHandoverDate: '2027-12-31',
    paymentPlanSummary: '30% booking, 36 monthly installments, 10% on possession.',
    amenities: ['Gated access', 'Prayer area', 'Community retail', 'Backup power'],
    units: [
      { id: 'u1', type: '1 bed apartment', size: '650 sq ft', price: 8500000 },
      { id: 'u2', type: '2 bed apartment', size: '1050 sq ft', price: 14500000 },
      { id: 'u3', type: '3 bed apartment', size: '1550 sq ft', price: 24500000 },
    ],
    updates: [{ id: 'up1', title: 'Structure work reached level 4', date: '2026-04-15', summary: 'Developer shared verified progress media for block A.' }],
  },
  {
    id: 'prj-2',
    slug: 'capital-heights-islamabad',
    name: 'Capital Heights',
    developerName: 'Margalla Build Co.',
    cityName: 'Islamabad',
    areaName: 'B-17',
    projectTypeName: 'Mixed-use',
    possessionStatus: 'Booking open',
    legalStatus: 'NOC submitted',
    minPriceAmount: 12500000,
    maxPriceAmount: 62000000,
    coverImageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    paymentPlanSummary: 'Quarterly installments with possession-linked final payment.',
    amenities: ['Retail boulevard', 'Basement parking', 'Smart access'],
  },
];

export const mockAreas: AreaSuggestion[] = [
  { id: 'dha-6-lhr', name: 'DHA Phase 6', cityName: 'Lahore', slug: 'dha-phase-6-lahore' },
  { id: 'clifton-2-khi', name: 'Clifton Block 2', cityName: 'Karachi', slug: 'clifton-block-2-karachi' },
  { id: 'g13-isb', name: 'G-13', cityName: 'Islamabad', slug: 'g-13-islamabad' },
  { id: 'b17-isb', name: 'B-17', cityName: 'Islamabad', slug: 'b-17-islamabad' },
];

export const mockPurposes: ReferenceItem[] = [
  { id: '11111111-1111-4111-8111-111111111111', code: 'buy', name: 'Buy' },
  { id: '22222222-2222-4222-8222-222222222222', code: 'rent', name: 'Rent' },
];

export const mockPropertyTypes: ReferenceItem[] = [
  { id: '33333333-3333-4333-8333-333333333333', code: 'house', name: 'House' },
  { id: '44444444-4444-4444-8444-444444444444', code: 'apartment', name: 'Apartment' },
  { id: '55555555-5555-4555-8555-555555555555', code: 'plot', name: 'Plot' },
  { id: '66666666-6666-4666-8666-666666666666', code: 'commercial', name: 'Commercial' },
];

export const mockCities: ReferenceItem[] = [
  { id: '77777777-7777-4777-8777-777777777777', code: 'lahore', name: 'Lahore', slug: 'lahore' },
  { id: '88888888-8888-4888-8888-888888888888', code: 'karachi', name: 'Karachi', slug: 'karachi' },
  { id: '99999999-9999-4999-8999-999999999999', code: 'islamabad', name: 'Islamabad', slug: 'islamabad' },
];

export const mockAreaReferences: ReferenceItem[] = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'DHA Phase 6', slug: 'dha-phase-6-lahore', cityId: mockCities[0].id, city: mockCities[0] },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Clifton Block 2', slug: 'clifton-block-2-karachi', cityId: mockCities[1].id, city: mockCities[1] },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'G-13', slug: 'g-13-islamabad', cityId: mockCities[2].id, city: mockCities[2] },
];

export const mockAmenities: ReferenceItem[] = [
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Near park', category: 'location' },
  { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Covered parking', category: 'parking' },
  { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', name: 'Security', category: 'building' },
  { id: '12121212-1212-4121-8121-121212121212', name: 'Backup power', category: 'utilities' },
];

export const mockFavorites: Favorite[] = [
  { id: 'fav-1', entityType: 'listing', entityId: mockListings[0].id, listing: mockListings[0], createdAt: '2026-04-30T09:00:00.000Z' },
  { id: 'fav-2', entityType: 'project', entityId: mockProjects[0].id, project: mockProjects[0], createdAt: '2026-04-29T14:00:00.000Z' },
];

export const mockSavedSearches: SavedSearch[] = [
  {
    id: 'ss-1',
    name: 'DHA verified houses',
    filtersJson: { q: 'DHA Lahore', propertyTypeCode: 'house', verifiedOnly: true, minPrice: 30000000, maxPrice: 70000000 },
    alertEnabled: true,
    updatedAt: '2026-04-30T11:00:00.000Z',
  },
  {
    id: 'ss-2',
    name: 'Islamabad new projects',
    filtersJson: { q: 'Islamabad', projectTypeCode: 'mixed-use' },
    alertEnabled: false,
    updatedAt: '2026-04-28T11:00:00.000Z',
  },
];

export const mockInquiries: Inquiry[] = [
  { id: 'inq-1', listingId: mockListings[0].id, inquiryType: 'visit_request', firstMessage: 'Can I schedule a visit?', status: 'open', createdAt: '2026-04-30T12:00:00.000Z' },
  { id: 'inq-2', projectId: mockProjects[0].id, inquiryType: 'general', firstMessage: 'Please share more details.', status: 'open', createdAt: '2026-04-29T13:00:00.000Z' },
];

export const mockChatMessages: ChatMessage[] = [
  { id: 'msg-1', chatId: 'chat-1', senderUserId: 'agent-1', body: 'The listing is available. Would tomorrow evening work?', sentAt: '2026-04-30T13:00:00.000Z' },
  { id: 'msg-2', chatId: 'chat-1', senderUserId: 'demo-user', body: 'Yes, please schedule a visit after 5 PM.', sentAt: '2026-04-30T13:05:00.000Z' },
];

export const mockChats: ChatThread[] = [
  { id: 'chat-1', contextType: 'listing', listingId: mockListings[0].id, lastMessageAt: '2026-04-30T13:05:00.000Z', messages: [mockChatMessages[1]], unread: true },
  { id: 'chat-2', contextType: 'project', projectId: mockProjects[0].id, lastMessageAt: '2026-04-29T15:10:00.000Z', messages: [{ id: 'msg-3', chatId: 'chat-2', body: 'Brochure request received.', sentAt: '2026-04-29T15:10:00.000Z' }] },
];

export const mockNotifications: Notification[] = [
  { id: 'ntf-1', notificationType: 'chat_message_received', title: 'New message received', body: 'The agent replied to your visit request.', payloadJson: { chatId: 'chat-1' }, createdAt: '2026-04-30T13:06:00.000Z' },
  { id: 'ntf-2', notificationType: 'verification_update', title: 'Verification update', body: 'Your profile verification is ready to continue.', createdAt: '2026-04-28T10:00:00.000Z', readAt: '2026-04-28T12:00:00.000Z' },
];

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'How to evaluate a new project payment plan',
    slug: 'evaluate-new-project-payment-plan',
    excerpt: 'A practical checklist for booking amount, installments, possession-linked payments, and legal status.',
    publishedAt: '2026-04-20T09:00:00.000Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    contentJson: {
      blocks: [
        { type: 'paragraph', text: 'Project payment plans should be compared by booking amount, installment cadence, possession-linked payments, and cancellation terms.' },
        { type: 'paragraph', text: 'Serious buyers should match the plan against construction progress, expected handover, and developer track record.' },
      ],
    },
  },
  {
    id: 'blog-2',
    title: 'Buyer checklist for verified property listings',
    slug: 'buyer-checklist-verified-property-listings',
    excerpt: 'Use verification, freshness, location clarity, and seller response quality to shortlist safer options.',
    publishedAt: '2026-04-18T09:00:00.000Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    contentJson: {
      blocks: [
        { type: 'paragraph', text: 'A verified listing is only the start. Check freshness, media quality, area context, and seller responsiveness before visiting.' },
      ],
    },
  },
  {
    id: 'blog-3',
    title: 'Lahore area guide for first-time buyers',
    slug: 'lahore-area-guide-first-time-buyers',
    excerpt: 'How to compare access, lifestyle, budgets, and future project supply across Lahore areas.',
    publishedAt: '2026-04-10T09:00:00.000Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80',
    contentJson: {
      blocks: [
        { type: 'paragraph', text: 'Area decisions should balance commute, school access, utilities, security, and future supply.' },
      ],
    },
  },
];

export function listingResponse(): SearchResponse<Listing> {
  return { total: mockListings.length, items: mockListings };
}

export function projectResponse(): SearchResponse<Project> {
  return { total: mockProjects.length, items: mockProjects };
}
