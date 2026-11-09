'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/api/engagement';
import { useNotifications } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';
import { getNotificationDestination } from '@/lib/notifications/notification-destination';

export function NotificationsClient() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useNotifications();
  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const readAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });

  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Notifications failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No notifications" message="Important inquiry, chat, and verification updates will appear here." />;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{data.filter((notification) => !notification.readAt).length} unread</p>
        <Button variant="secondary" disabled={readAllMutation.isPending || data.every((notification) => notification.readAt)} onClick={() => readAllMutation.mutate()}>{readAllMutation.isPending ? 'Marking…' : 'Mark all read'}</Button>
      </div>
      {data.map((notification) => {
        const destination = getNotificationDestination(notification.payloadJson);
        return (
          <Card key={notification.id} className={`p-4 sm:p-5 ${notification.readAt ? '' : 'border-emerald-300 bg-emerald-50/30'}`}>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  {!notification.readAt ? <Badge>Unread</Badge> : null}
                  <Badge className="border-stone-200 bg-stone-100 text-muted">{notification.notificationType}</Badge>
                </div>
                <h2 className="mt-3 font-black">{notification.title}</h2>
                <p className="mt-1 break-words text-sm leading-6 text-muted">{notification.body}</p>
                {destination ? <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-trust" href={destination}>View update</Link> : null}
              </div>
              <div className="grid gap-2 sm:min-w-32 sm:text-right">
                <span className="text-xs text-muted sm:text-sm">{formatDate(notification.createdAt)}</span>
                {!notification.readAt ? <Button variant="secondary" disabled={readMutation.isPending} onClick={() => readMutation.mutate(notification.id)}>{readMutation.isPending ? 'Updating…' : 'Mark read'}</Button> : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
