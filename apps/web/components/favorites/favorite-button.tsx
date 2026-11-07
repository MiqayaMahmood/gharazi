'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { addFavorite, removeFavorite } from '@/lib/api/engagement';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import type { FavoriteEntityType } from '@/types/engagement';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useFavorites } from '@/lib/query/hooks';

export function FavoriteButton({
  entityType,
  entityId,
  initialSaved = false,
  label = 'Save',
  savedLabel = 'Saved',
  compact = false,
}: {
  entityType: FavoriteEntityType;
  entityId: string;
  initialSaved?: boolean;
  label?: string;
  savedLabel?: string;
  compact?: boolean;
}) {
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(initialSaved ? true : null);
  const [errorText, setErrorText] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();
  const favorites = useFavorites(Boolean(user));
  const serverSaved = favorites.data?.some((favorite) => favorite.entityType === entityType && favorite.entityId === entityId) ?? false;
  const isSaved = optimisticSaved ?? serverSaved;
  const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : pathname;
  const mutation = useMutation<unknown, Error>({
    mutationFn: () => {
      setErrorText('');
      return isSaved ? removeFavorite(entityType, entityId) : addFavorite(entityType, entityId);
    },
    onMutate: () => setOptimisticSaved(!isSaved),
    onSettled: () => {
      setOptimisticSaved(null);
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error) => {
      setOptimisticSaved(null);
      setErrorText(getUserFriendlyErrorMessage(error));
    },
  });

  function handleClick() {
    if (!user && !isLoading) {
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="grid gap-1">
      <Button
        aria-label={isSaved ? savedLabel : label}
        className={compact ? 'h-11 w-11 rounded-full border-white/80 bg-white/95 p-0 shadow-soft' : undefined}
        title={isSaved ? savedLabel : label}
        variant={isSaved ? 'primary' : 'secondary'}
        onClick={handleClick}
        disabled={mutation.isPending || isLoading}
      >
        {compact ? (
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
          </svg>
        ) : isSaved ? savedLabel : label}
      </Button>
      {errorText ? <p className={compact ? 'sr-only' : 'text-xs font-semibold text-red-700'} role="status">{errorText}</p> : null}
    </div>
  );
}
