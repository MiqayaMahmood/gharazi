import type { Metadata } from 'next';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { ListingComparisonClient } from '@/components/compare/listing-comparison-client';
import { ToolDisclaimer } from '@/components/legal/disclaimers';

export const metadata: Metadata = {
  title: 'Compare listings',
  description: 'Compare property listings side by side.',
};

export default function CompareListingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <ViewTracker eventType="tool_viewed" entityType="tool" metadataJson={{ tool: 'compare-listings' }} />
      <h1 className="text-3xl font-black">Compare listings</h1>
      <p className="mt-2 text-muted">Shortlist key property facts before you inquire or visit.</p>
      <ToolDisclaimer className="mt-5" />
      <div className="mt-6"><ListingComparisonClient /></div>
    </div>
  );
}
