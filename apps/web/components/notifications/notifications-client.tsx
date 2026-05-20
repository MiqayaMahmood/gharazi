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
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => readAllMutation.mutate()}>Mark all read</Button>
      </div>
      {data.map((notification) => {
        const chatId = notification.payloadJson?.chatId;
        return (
          <Card key={notification.id} className={`p-5 ${notification.readAt ? '' : 'border-emerald-300'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  {!notification.readAt ? <Badge>Unread</Badge> : null}
                  <Badge className="border-stone-200 bg-stone-100 text-muted">{notification.notificationType}</Badge>
                </div>
                <h2 className="mt-3 font-black">{notification.title}</h2>
                <p className="mt-1 text-sm text-muted">{notification.body}</p>
                {typeof chatId === 'string' ? <Link className="mt-3 inline-block text-sm font-bold text-trust" href="/dashboard/chats">Open chat</Link> : null}
              </div>
              <div className="grid gap-2 text-right">
                <span className="text-sm text-muted">{formatDate(notification.createdAt)}</span>
                {!notification.readAt ? <Button variant="secondary" onClick={() => readMutation.mutate(notification.id)}>Mark read</Button> : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
