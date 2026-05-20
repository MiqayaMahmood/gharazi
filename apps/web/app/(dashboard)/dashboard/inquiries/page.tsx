import type { Metadata } from 'next';
import { InquiriesClient } from '@/components/inquiries/inquiries-client';

export const metadata: Metadata = {
  title: 'Inquiries',
  description: 'Track listing and project inquiries.',
};

export default function InquiriesPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Inquiries</h1>
      <p className="mt-2 text-muted">Your sent and received inquiry activity.</p>
      <div className="mt-6"><InquiriesClient /></div>
    </div>
  );
}
