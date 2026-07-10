import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChatInboxClient } from '@/components/chat/chat-inbox-client';

export const metadata: Metadata = {
  title: 'Chats',
  description: 'Message owners, agents, and developers.',
};

export default function ChatsPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Chats</h1>
      <p className="mt-2 text-muted">Text-first conversations connected to listings and projects.</p>
      <div className="mt-6"><Suspense><ChatInboxClient /></Suspense></div>
    </div>
  );
}
