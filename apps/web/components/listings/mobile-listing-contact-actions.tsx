'use client';

import { useCurrentUser, useListingContact } from '@/lib/query/hooks';
import { buildPropertyWhatsAppHref, buildTelephoneHref } from '@/lib/contact/contact-links';
import { ContactActionLink } from './contact-action-link';

export function MobileListingContactActions({ listingId, publicId, title }: { listingId: string; publicId: string; title: string }) {
  const { data: user } = useCurrentUser();
  const contact = useListingContact(listingId, Boolean(user));
  const callHref = buildTelephoneHref(contact.data?.contactPhone);
  const whatsappHref = buildPropertyWhatsAppHref(contact.data?.whatsappUrl, title, publicId);

  return (
    <div className="grid gap-2 lg:hidden" aria-label="Contact seller actions">
      <div className="flex gap-2">
        {callHref ? <ContactActionLink className="flex-1" href={callHref} ariaLabel={`Call about ${title}`}>Call</ContactActionLink> : null}
        {whatsappHref ? <ContactActionLink className="flex-1" href={whatsappHref} ariaLabel={`Open WhatsApp about ${title}`} external>WhatsApp</ContactActionLink> : null}
        <ContactActionLink className="flex-1" href="#inquiry" ariaLabel={`Send an inquiry about ${title}`} primary>Send inquiry</ContactActionLink>
      </div>
      {user && !contact.isLoading && !callHref && !whatsappHref ? <p className="text-xs text-muted">Direct contact details are not available. You can still send an inquiry.</p> : null}
    </div>
  );
}
