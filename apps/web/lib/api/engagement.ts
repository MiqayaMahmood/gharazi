import { apiRequest, getStoredToken } from './client';
import { readWithFallback } from './mock-fallback';
import { mockChats, mockChatMessages, mockFavorites, mockInquiries, mockListings, mockNotifications, mockProjects, mockSavedSearches } from '@/lib/mock-data';
import type { ChatMessage, ChatThread, Favorite, FavoriteEntityType, Inquiry, Notification, SavedSearch } from '@/types/engagement';
import type { Listing, ListingContact, Project } from '@/types/marketplace';

function requireSession() {
  if (!getStoredToken()) throw new Error('Login required');
}

export function listFavorites(entityType?: FavoriteEntityType) {
  const suffix = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return readWithFallback(apiRequest<Favorite[]>(`/favorites${suffix}`), mockFavorites, 'favorites');
}

export function addFavorite(entityType: FavoriteEntityType, entityId: string) {
  requireSession();
  return apiRequest<Favorite>('/favorites', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId }),
  });
}

export function removeFavorite(entityType: FavoriteEntityType, entityId: string) {
  requireSession();
  return apiRequest<{ ok: boolean }>('/favorites', {
    method: 'DELETE',
    body: JSON.stringify({ entityType, entityId }),
  });
}

export function listSavedSearches() {
  return readWithFallback(apiRequest<SavedSearch[]>('/saved-searches'), mockSavedSearches, 'saved searches');
}

export function createSavedSearch(input: { name: string; filtersJson: Record<string, unknown>; alertEnabled?: boolean }) {
  requireSession();
  return apiRequest<SavedSearch>('/saved-searches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSavedSearch(id: string, input: Partial<Pick<SavedSearch, 'name' | 'filtersJson' | 'alertEnabled'>>) {
  return apiRequest<SavedSearch>(`/saved-searches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSavedSearch(id: string) {
  return apiRequest<{ ok: boolean }>(`/saved-searches/${id}`, { method: 'DELETE' });
}

export function createInquiry(input: { listingId?: string; projectId?: string; inquiryType?: string; firstMessage?: string; createChat?: boolean }) {
  requireSession();
  return apiRequest<Inquiry>('/inquiries', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getListingContact(listingId: string) {
  requireSession();
  return apiRequest<ListingContact>(`/listings/${listingId}/contact`);
}

export function listInquiries() {
  return readWithFallback(apiRequest<Inquiry[]>('/inquiries/me'), mockInquiries, 'inquiries');
}

export function listChats() {
  return readWithFallback(apiRequest<ChatThread[]>('/chats'), mockChats, 'chats');
}

export function getChatMessages(chatId: string) {
  return readWithFallback(apiRequest<ChatMessage[]>(`/chats/${chatId}/messages`), mockChatMessages.filter((message) => message.chatId === chatId), 'chat messages');
}

export function sendChatMessage(chatId: string, body: string) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messageType: 'text', body }),
  });
}

export function listNotifications() {
  return readWithFallback(apiRequest<Notification[]>('/notifications'), mockNotifications, 'notifications');
}

export function markNotificationRead(id: string) {
  return apiRequest<Notification>(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return apiRequest<{ ok: boolean }>('/notifications/read-all', { method: 'POST' });
}

export function listMyListings() {
  return readWithFallback(apiRequest<Listing[]>('/listings/me'), mockListings, 'my listings');
}

export function listMyProjects() {
  return readWithFallback(apiRequest<Project[]>('/projects/me'), mockProjects, 'my projects');
}
