'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { createInquiry } from '@/lib/api/engagement';
import { useCurrentUser } from '@/lib/query/hooks';

const prompts = ['Is this still available?', 'Can I schedule a visit?', 'What is the final price?', 'Please share more details.'];

export function InquiryPanel({ subject, listingId, projectId }: { subject: string; listingId?: string; projectId?: string }) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const [message, setMessage] = useState(prompts[0]);
  const [inquiryType, setInquiryType] = useState('general');
  const mutation = useMutation({ mutationFn: () => createInquiry({ listingId, projectId, inquiryType, firstMessage: message, createChat: true }) });

  function submit() {
    if (!user && !isLoading) {
      router.push(`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
      return;
    }
    mutation.mutate();
  }

  return (
    <Card id="inquiry" className="sticky top-20 grid gap-4 p-4">
      <div>
        <h2 className="text-lg font-black">Contact safely</h2>
        <p className="text-sm text-muted">Send a guided inquiry and start a chat thread when available. Replies stay in your dashboard.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-muted" htmlFor="inquiry-type">Inquiry type</label>
        <Select id="inquiry-type" value={inquiryType} onChange={(event) => setInquiryType(event.target.value)}>
          <option value="general">General inquiry</option>
          <option value="visit_request">Schedule a visit</option>
          <option value="price_request">Final price</option>
          <option value="call_request">Request a call</option>
        </Select>
      </div>
      <div className="grid gap-2">
        {prompts.map((prompt) => (
          <button key={prompt} className="rounded-md border border-line bg-white px-3 py-2 text-left text-sm font-semibold hover:bg-emerald-50" type="button" onClick={() => setMessage(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-muted" htmlFor="message">Message</label>
        <Input id="message" value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
      <Button onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Sending...' : 'Send inquiry'}</Button>
      <Button variant="secondary" onClick={submit} disabled={mutation.isPending}>Start chat</Button>
      {mutation.isSuccess ? <p className="text-sm font-semibold text-trust">Inquiry sent. Check dashboard chats for replies.</p> : null}
      {mutation.isError ? <p className="text-sm font-semibold text-red-700">Could not send inquiry. Please try again.</p> : null}
      <p className="text-xs text-muted">Do not share sensitive financial details. Verify parties, documents, and property information independently.</p>
      <p className="text-xs text-muted">Reference: {subject}</p>
    </Card>
  );
}
