'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useInquiries } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';

export function InquiriesClient() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');
  const projectId = searchParams.get('projectId');
  const inquiryId = searchParams.get('inquiryId');
  const { data = [], isLoading, isError } = useInquiries();
  const filtered = data.filter((inquiry) => (!inquiryId || inquiry.id === inquiryId) && (!listingId || inquiry.listingId === listingId) && (!projectId || inquiry.projectId === projectId));
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Inquiries failed to load" message="Please retry after refreshing the page." />;
  if (filtered.length === 0) return <EmptyState title="No inquiries yet" message="Inquiries from listing and project detail pages will appear here." />;

  return (
    <div className="grid gap-4">
      {filtered.map((inquiry) => (
        <Card key={inquiry.id} className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge>{readableLabel(inquiry.status ?? 'open')}</Badge>
                <InfoChip>{readableLabel(inquiry.inquiryType ?? 'general')}</InfoChip>
              </div>
              <h2 className="mt-3 break-words font-black">{inquiry.listing?.title ?? inquiry.project?.name ?? (inquiry.listingId ? 'Property inquiry' : 'Project inquiry')}</h2>
              <p className="mt-2 break-words text-sm leading-6 text-ink">{inquiry.firstMessage ?? 'Inquiry sent'}</p>
              <p className="mt-2 text-xs text-muted">Received {formatDate(inquiry.createdAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-40 sm:grid-cols-1">
              {inquiry.listing?.publicId ? <Button asChild href={`/listing/${encodeURIComponent(inquiry.listing.publicId)}`} variant="secondary">View property</Button> : null}
              {inquiry.project?.slug ? <Button asChild href={`/project/${encodeURIComponent(inquiry.project.slug)}`} variant="secondary">View project</Button> : null}
              {inquiry.chat?.id ? <Button asChild href={`/dashboard/chats?chatId=${encodeURIComponent(inquiry.chat.id)}`}>Open conversation</Button> : null}
            </div>
          </div>
        </Card>
      ))}
      {(listingId || projectId || inquiryId) ? <Link className="inline-flex min-h-11 items-center text-sm font-bold text-trust" href="/dashboard/inquiries">View all inquiries</Link> : null}
    </div>
  );
}

function readableLabel(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
