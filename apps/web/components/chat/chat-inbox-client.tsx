'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { ErrorAlert } from '@/components/ui/error-alert';
import { sendChatMessage } from '@/lib/api/engagement';
import { useChatMessages, useChats, useCurrentUser } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';

export function ChatInboxClient() {
  const [activeId, setActiveId] = useState<string | undefined>();
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const chats = useChats();
  const activeChat = useMemo(() => chats.data?.find((chat) => chat.id === (activeId ?? chats.data?.[0]?.id)), [activeId, chats.data]);
  const messages = useChatMessages(activeChat?.id);
  const sendMutation = useMutation({
    mutationFn: () => sendChatMessage(activeChat?.id as string, body),
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', activeChat?.id] });
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  if (chats.isLoading) return <Skeleton className="h-[520px]" />;
  if (chats.isError) return <ErrorState title="Chats failed to load" message="Please retry after refreshing the page." />;
  if (!chats.data?.length) return <EmptyState title="No conversations yet" message="Start an inquiry from a listing or project page to open chat." />;

  return (
    <div className="grid min-h-[560px] overflow-hidden rounded-lg border border-line bg-white shadow-soft lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-line lg:border-b-0 lg:border-r">
        {chats.data.map((chat) => (
          <button key={chat.id} className={`block w-full border-b border-line p-4 text-left hover:bg-emerald-50 ${activeChat?.id === chat.id ? 'bg-emerald-50' : ''}`} type="button" onClick={() => setActiveId(chat.id)}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{chat.contextType ?? 'Conversation'} {chat.id.slice(0, 6)}</p>
              {chat.unread ? <Badge>Unread</Badge> : null}
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-muted">{chat.messages?.[0]?.body ?? 'No messages yet'}</p>
            <p className="mt-1 text-xs text-muted">{formatDate(chat.lastMessageAt)}</p>
          </button>
        ))}
      </aside>
      <section className="flex min-h-[560px] flex-col">
        <div className="border-b border-line p-4">
          <h2 className="font-black">Conversation</h2>
          <p className="text-sm text-muted">{activeChat?.contextType ?? 'general'} context {activeChat?.listingId ?? activeChat?.projectId ?? ''}</p>
        </div>
        <div className="flex-1 space-y-3 overflow-auto bg-stone-50 p-4">
          {messages.isLoading ? <Skeleton className="h-40" /> : null}
          {messages.data?.map((message) => {
            const own = message.senderUserId === user?.id || message.senderUserId === 'demo-user';
            return (
              <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${own ? 'bg-trust text-white' : 'bg-white text-ink shadow-sm'}`}>
                  <p>{message.body}</p>
                  <p className={`mt-1 text-xs ${own ? 'text-emerald-50' : 'text-muted'}`}>{formatDate(message.sentAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form className="flex gap-2 border-t border-line p-4" onSubmit={(event) => { event.preventDefault(); if (body.trim() && activeChat?.id) sendMutation.mutate(); }}>
          <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message" />
          <Button disabled={!body.trim() || sendMutation.isPending}>Send</Button>
        </form>
        {sendMutation.isError ? <div className="border-t border-line p-4"><ErrorAlert error={sendMutation.error} /></div> : null}
      </section>
    </div>
  );
}
