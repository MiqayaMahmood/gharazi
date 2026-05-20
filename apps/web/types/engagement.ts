import type { Listing, Project } from './marketplace';

export type FavoriteEntityType = 'listing' | 'project' | 'developer' | 'area' | 'blog' | 'tool' | 'agent' | 'agency';

export type Favorite = {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  createdAt?: string;
  title?: string;
  imageUrl?: string;
  url?: string;
  listing?: Listing;
  project?: Project;
  developer?: {
    id: string;
    companyName: string;
    slug: string;
    logoUrl?: string;
    verificationStatus?: string;
    description?: string;
  };
  area?: {
    id: string;
    name: string;
    slug: string;
    cityName?: string;
    citySlug?: string;
    url?: string;
  };
  blog?: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    coverImageUrl?: string;
    publishedAt?: string;
  };
};

export type SavedSearch = {
  id: string;
  name: string;
  filtersJson: Record<string, unknown>;
  alertEnabled?: boolean;
  updatedAt?: string;
};

export type Inquiry = {
  id: string;
  listingId?: string;
  projectId?: string;
  inquiryType?: string;
  firstMessage?: string;
  status?: string;
  createdAt?: string;
};

export type ChatThread = {
  id: string;
  contextType?: 'listing' | 'project' | 'general';
  listingId?: string;
  projectId?: string;
  lastMessageAt?: string;
  messages?: ChatMessage[];
  unread?: boolean;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderUserId?: string;
  messageType?: string;
  body?: string;
  sentAt?: string;
};

export type Notification = {
  id: string;
  notificationType: string;
  title: string;
  body?: string;
  payloadJson?: Record<string, unknown>;
  readAt?: string | null;
  createdAt?: string;
};
