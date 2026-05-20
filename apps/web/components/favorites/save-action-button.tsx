'use client';

import { FavoriteButton } from './favorite-button';
import type { FavoriteEntityType } from '@/types/engagement';

export function SaveActionButton({ entityType, entityId, label = 'Save' }: { entityType: FavoriteEntityType; entityId: string; label?: string }) {
  return <FavoriteButton entityType={entityType} entityId={entityId} label={label} savedLabel={label === 'Bookmark' ? 'Bookmarked' : 'Saved'} />;
}
