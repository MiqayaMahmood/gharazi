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

export type Listing = {
  id: string;
  publicId: string;
  title: string;
  description?: string;
  priceAmount?: number;
  cityId?: string;
  cityName: string;
  areaId?: string;
  areaName: string;
  propertyTypeId?: string;
  propertyTypeName?: string;
  purposeId?: string;
  purposeName?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaValue?: number;
  areaUnit?: string;
  coverImageUrl?: string;
  verificationStatus?: string;
  isFeatured?: boolean;
  updatedAt?: string;
  publishedAt?: string;
  amenities?: Amenity[];
  listerName?: string;
  listerRole?: string;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  developerName: string;
  cityName: string;
  areaName: string;
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
