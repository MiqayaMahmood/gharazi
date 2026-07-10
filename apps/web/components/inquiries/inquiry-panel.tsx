'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { createInquiry } from '@/lib/api/engagement';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';
import { useCurrentUser, useListingContact } from '@/lib/query/hooks';

const prompts = ['Is this still available?', 'Can I schedule a visit?', 'What is the final price?', 'Please share more details.'];

export function InquiryPanel({
  subject,
  listingId,
  projectId,
  listerName,
  listerRole,
}: {
  subject: string;
  listingId?: string;
  projectId?: string;
  listerName?: string;
  listerRole?: string;
}) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const listingContact = useListingContact(listingId, Boolean(user && listingId));
  const [message, setMessage] = useState(prompts[0]);
  const [inquiryType, setInquiryType] = useState('general');
  const [formOpen, setFormOpen] = useState(false);
  const mutation = useMutation({ mutationFn: () => createInquiry({ listingId, projectId, inquiryType, firstMessage: message, createChat: true }) });
  const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}#inquiry` : '/';
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?returnTo=${encodeURIComponent(returnTo)}`;

  function submit() {
    if (isLoading) return;
    if (!user && !isLoading) {
      router.push(loginHref);
      return;
    }
    mutation.mutate();
  }

  if (!user && !isLoading) {
    return (
      <Card id="inquiry" className="self-start p-4 lg:sticky lg:top-24">
        <div className="grid gap-4">
          <div>
            <h2 className="text-lg font-black">Contact owner/agent</h2>
            <p className="mt-1 text-sm text-muted">Login or create an account to contact the owner/agent.</p>
          </div>
          <div className="rounded-md border border-line bg-white p-3">
            <p className="text-sm font-bold">{listerName ?? 'Owner/agent'}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{listerRole ?? 'Lister'}</p>
          </div>
          <div className="rounded-md border border-line bg-stone-50 p-3 text-sm font-semibold text-muted">
            Phone and WhatsApp are available after login.
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Button href={loginHref} asChild>Login</Button>
            <Button href={registerHref} asChild variant="secondary">Register</Button>
          </div>
          <p className="text-xs text-muted">Contact details are protected until you are signed in.</p>
        </div>
      </Card>
    );
  }

  const contact = listingContact.data;

  return (
    <Card id="inquiry" className="self-start p-4 lg:sticky lg:top-24">
      <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-black">Contact safely</h2>
        <p className="text-sm text-muted">{subject}</p>
      </div>
      <div className="rounded-md border border-line bg-stone-50 p-3">
        <p className="text-sm font-bold">{contact?.contactName ?? listerName ?? 'Owner/agent'}</p>
        <p className="mt-1 text-xs font-semibold text-muted">{listerRole ?? 'Lister'}</p>
        {listingContact.isLoading ? <p className="mt-1 text-sm text-muted">Loading contact details...</p> : null}
        {contact?.contactPhone ? <p className="mt-1 text-sm font-semibold text-ink">{contact.contactPhone}</p> : null}
        {!listingContact.isLoading && !contact?.contactPhone ? <p className="mt-1 text-sm text-muted">Phone details are not available for this listing.</p> : null}
      </div>
      {contact?.whatsappUrl ? <Button href={contact.whatsappUrl} asChild>WhatsApp</Button> : null}
      <Button type="button" onClick={() => setFormOpen((value) => !value)} variant={formOpen ? 'secondary' : 'primary'}>
        {formOpen ? 'Hide inquiry' : 'Send inquiry'}
      </Button>
      {formOpen ? (
        <div className="grid gap-3">
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
          <Button onClick={submit} disabled={mutation.isPending || isLoading}>{mutation.isPending ? 'Sending...' : 'Send inquiry'}</Button>
        </div>
      ) : null}
      <Button variant="secondary" onClick={submit} disabled={mutation.isPending || isLoading}>Start chat</Button>
      {mutation.isSuccess ? <p className="text-sm font-semibold text-trust">Inquiry sent. Check dashboard chats for replies.</p> : null}
      {mutation.isError ? <p className="text-sm font-semibold text-red-700">{getUserFriendlyErrorMessage(mutation.error)}</p> : null}
      <p className="text-xs text-muted">Do not share sensitive financial details. Verify parties, documents, and property information independently.</p>
      {listingContact.isError ? <p className="text-xs font-semibold text-red-700">Could not load contact details.</p> : null}
      </div>
    </Card>
  );
}
