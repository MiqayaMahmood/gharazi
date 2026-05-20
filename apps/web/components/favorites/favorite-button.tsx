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
}: {
  entityType: FavoriteEntityType;
  entityId: string;
  initialSaved?: boolean;
  label?: string;
  savedLabel?: string;
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
  const mutation = useMutation<unknown, Error>({
    mutationFn: () => {
      setErrorText('');
      if (!user && !isLoading) throw new Error('Login required');
      return isSaved ? removeFavorite(entityType, entityId) : addFavorite(entityType, entityId);
    },
    onMutate: () => setOptimisticSaved(!isSaved),
    onSettled: () => {
      setOptimisticSaved(null);
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error) => {
      setOptimisticSaved(null);
      if (error.message === 'Login required') router.push(`/login?next=${encodeURIComponent(pathname)}`);
      else setErrorText(getUserFriendlyErrorMessage(error));
    },
  });

  return (
    <div className="grid gap-1">
      <Button variant={isSaved ? 'primary' : 'secondary'} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {isSaved ? savedLabel : label}
      </Button>
      {errorText ? <p className="text-xs font-semibold text-red-700">{errorText}</p> : null}
    </div>
  );
}
