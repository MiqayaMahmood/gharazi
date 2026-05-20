'use client';

import { Badge, InfoChip } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { useInquiries } from '@/lib/query/hooks';
import { formatDate } from '@/lib/utils';

export function InquiriesClient() {
  const { data = [], isLoading, isError } = useInquiries();
  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState title="Inquiries failed to load" message="Please retry after refreshing the page." />;
  if (data.length === 0) return <EmptyState title="No inquiries yet" message="Inquiries from listing and project detail pages will appear here." />;

  return (
    <div className="grid gap-4">
      {data.map((inquiry) => (
        <Card key={inquiry.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{inquiry.status ?? 'open'}</Badge>
                <InfoChip>{inquiry.inquiryType ?? 'general'}</InfoChip>
              </div>
              <p className="mt-3 font-bold">{inquiry.firstMessage ?? 'Inquiry sent'}</p>
              <p className="mt-1 text-sm text-muted">{inquiry.listingId ? `Listing ${inquiry.listingId}` : `Project ${inquiry.projectId}`}</p>
            </div>
            <p className="text-sm text-muted">{formatDate(inquiry.createdAt)}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
