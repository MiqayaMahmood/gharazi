import { apiRequest, toQueryString } from './client';
import type { Listing, Project } from '@/types/marketplace';

export type AnalyticsEventInput = {
  eventType: string;
  entityType?: string;
  entityId?: string;
  sessionId?: string;
  anonymousId?: string;
  idempotencyKey?: string;
  metadataJson?: Record<string, unknown>;
  occurredAt?: string;
};

export type PopularResponse<T> = {
  entityType: string;
  total: number;
  items: Array<T & { stats?: { viewsCount?: number; favoritesCount?: number } }>;
};

export function trackAnalyticsEvent(input: AnalyticsEventInput) {
  return apiRequest<{ id: string }>('/analytics/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getPopularListings(params: { purpose?: string; period?: string; limit?: number } = {}) {
  return apiRequest<PopularResponse<Listing>>(`/stats/popular${toQueryString({ entityType: 'listing', ...params })}`);
}

export function getPopularProjects(params: { period?: string; limit?: number } = {}) {
  return apiRequest<PopularResponse<Project>>(`/stats/popular${toQueryString({ entityType: 'project', ...params })}`);
}

export function getEntityStats(entityType: string, entityId: string) {
  return apiRequest<Record<string, number | string>>(`/stats/entity/${entityType}/${entityId}`);
}
