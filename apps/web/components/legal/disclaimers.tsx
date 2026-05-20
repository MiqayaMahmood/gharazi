import Link from 'next/link';
import { cn } from '@/lib/utils';

const messages = {
    info: 'Information on Gharazi is provided for general discovery and should be independently verified before decisions.',
  listing: 'Listing information is submitted by third parties. Verify ownership, documents, pricing, availability, and condition independently before any transaction.',
  project: 'Project details, payment plans, handover timelines, approvals, and legal status should be verified directly with the developer and relevant authorities.',
  tool: 'Comparisons, tools, estimates, and decision-support summaries are indicative only and are not financial, legal, tax, or investment advice.',
  blog: 'Blog content is general information only. It is not legal, financial, tax, investment, construction, or real-estate professional advice.',
  sponsored: 'Featured, recommended, premium, or sponsored placements may reflect platform signals or paid visibility and are not guarantees or endorsements.',
  advertising: 'Advertising visibility does not guarantee sales, rentals, leads, conversions, rankings, or transaction outcomes.',
};

export function InfoDisclaimer({ type = 'info', className }: { type?: keyof typeof messages; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950', className)}>
      <strong>Important: </strong>{messages[type]} <Link className="font-bold underline" href="/disclaimer">Read disclaimer</Link>.
    </div>
  );
}

export function ListingDisclaimer(props: { className?: string }) {
  return <InfoDisclaimer type="listing" {...props} />;
}

export function ProjectDisclaimer(props: { className?: string }) {
  return <InfoDisclaimer type="project" {...props} />;
}

export function ToolDisclaimer(props: { className?: string }) {
  return <InfoDisclaimer type="tool" {...props} />;
}

export function BlogDisclaimer(props: { className?: string }) {
  return <InfoDisclaimer type="blog" {...props} />;
}

export function SponsoredDisclaimer(props: { className?: string }) {
  return <InfoDisclaimer type="sponsored" {...props} />;
}

export function AdvertisingDisclaimer(props: { className?: string }) {
  return <InfoDisclaimer type="advertising" {...props} />;
}
