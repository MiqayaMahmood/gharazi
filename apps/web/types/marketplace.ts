export type SearchResponse<T> = {
  total: number;
  items: T[];
  aggregations?: Record<string, unknown>;
};

export type AreaSuggestion = {
  id: string;
  name: string;
  cityName?: string;
  slug?: string;
};

export type Amenity = {
  id?: string;
  code?: string;
  name: string;
  slug?: string;
};

export type ListingImage = {
  id: string;
  url: string;
  alt?: string;
  sortOrder?: number;
  isCover?: boolean;
  mediaType?: string;
  storageKey?: string;
};

export type Listing = {
  id: string;
  publicId: string;
  title: string;
  description?: string;
  priceAmount?: number;
  cityId?: string;
  cityName: string;
  citySlug?: string;
  areaId?: string;
  areaName: string;
  areaSlug?: string;
  propertyTypeId?: string;
  propertyTypeName?: string;
  purposeId?: string;
  purposeSlug?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaValue?: number;
  areaUnit?: string;
  coverImageUrl?: string;
  images?: ListingImage[];
  media?: ListingImage[];
  verificationStatus?: string;
  isFeatured?: boolean;
  isHot?: boolean;
  updatedAt?: string;
  publishedAt?: string;
  amenities?: Amenity[];
  listerName?: string;
  listerRole?: string;
  contactName?: string;
  contactPhone?: string;
  floorNumber?: number;
  totalFloors?: number;
  furnishedStatus?: string;
  possessionStatus?: string;
  addressLine?: string;
};

export type ListingContact = {
  contactName?: string;
  contactPhone?: string;
  whatsappUrl?: string;
};

export type ViewerContext = {
  isOwner: boolean;
  isManager: boolean;
  isAdmin: boolean;
  canManage: boolean;
  canContact: boolean;
  canFavorite: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canRefresh: boolean;
  canMarkSoldOrRented: boolean;
};

export type OwnerSummary = {
  status?: string;
  views?: number;
  uniqueViews?: number;
  favorites?: number;
  inquiries?: number;
  chats?: number;
  messages?: number;
  lastRefreshedAt?: string;
  publishedAt?: string;
  searchVisibility?: string;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  developerName: string;
  cityName: string;
  citySlug?: string;
  areaName: string;
  areaSlug?: string;
  projectTypeName?: string;
  possessionStatus?: string;
  legalStatus?: string;
  verificationStatus?: string;
  minPriceAmount?: number;
  maxPriceAmount?: number;
  coverImageUrl?: string;
  launchDate?: string;
  expectedHandoverDate?: string;
  paymentPlanSummary?: string;
  amenities?: string[];
  units?: Array<{ id: string; type: string; size: string; price?: number }>;
  updates?: Array<{ id: string; title: string; date: string; summary: string }>;
};
