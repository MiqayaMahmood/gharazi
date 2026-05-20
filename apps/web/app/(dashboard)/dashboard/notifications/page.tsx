import type { Metadata } from 'next';
import { NotificationsClient } from '@/components/notifications/notifications-client';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Review account and marketplace notifications.',
};

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Notifications</h1>
      <p className="mt-2 text-muted">Inquiry, chat, verification, moderation, and subscription updates.</p>
      <div className="mt-6"><NotificationsClient /></div>
    </div>
  );
}
