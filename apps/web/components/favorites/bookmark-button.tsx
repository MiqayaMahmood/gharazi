'use client';

import { FavoriteButton } from './favorite-button';
import type { FavoriteEntityType } from '@/types/engagement';

export function BookmarkButton({ entityType, entityId }: { entityType: FavoriteEntityType; entityId?: string }) {
  if (!entityId) return null;
  return <FavoriteButton entityType={entityType} entityId={entityId} label="Bookmark" savedLabel="Bookmarked" />;
}
