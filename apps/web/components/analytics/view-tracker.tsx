'use client';

import { useEffect } from 'react';
import { trackAnalyticsEvent } from '@/lib/api/analytics';

type ViewTrackerProps = {
  eventType: string;
  entityType: string;
  entityId?: string;
  metadataJson?: Record<string, unknown>;
};

export function ViewTracker({ eventType, entityType, entityId, metadataJson }: ViewTrackerProps) {
  useEffect(() => {
      const anonymousId = getOrCreateStorageValue('gharazi_anonymous_id');
      const sessionId = getOrCreateStorageValue('gharazi_session_id', true);
    const day = new Date().toISOString().slice(0, 10);
    const idPart = entityId ?? String(metadataJson?.slug ?? metadataJson?.path ?? 'unknown');
    const idempotencyKey = `view:${eventType}:${entityType}:${idPart}:${sessionId}:${day}`;
    const sessionKey = `tracked:${idempotencyKey}`;
    if (window.sessionStorage.getItem(sessionKey)) return;
    window.sessionStorage.setItem(sessionKey, 'true');
    void trackAnalyticsEvent({ eventType, entityType, entityId, anonymousId, sessionId, idempotencyKey, metadataJson }).catch((error) => {
      if (process.env.NODE_ENV === 'development') console.warn('View tracking failed', error);
    });
  }, [entityId, entityType, eventType, metadataJson]);

  return null;
}

function getOrCreateStorageValue(key: string, session = false) {
  const storage = session ? window.sessionStorage : window.localStorage;
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  storage.setItem(key, value);
  return value;
}
