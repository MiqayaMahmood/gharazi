import type { Metadata } from 'next';
import { ListingFormClient } from '@/components/forms/listing-form-client';

export const metadata: Metadata = {
  title: 'Add listing',
  description: 'Create a property listing draft.',
};

export default function NewListingPage() {
  return (
    <div>
      <h1 className="text-2xl font-black sm:text-3xl">Post a property</h1>
      <p className="mt-2 text-muted">Create a clear, verified-ready property listing step by step.</p>
      <div className="mt-4 sm:mt-6"><ListingFormClient /></div>
    </div>
  );
}
