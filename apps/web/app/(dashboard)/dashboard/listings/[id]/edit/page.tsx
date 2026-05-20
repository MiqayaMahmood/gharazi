import type { Metadata } from 'next';
import { ListingEditLoader } from '@/components/forms/listing-edit-loader';

export const metadata: Metadata = {
  title: 'Edit listing',
  description: 'Edit listing details and publishing status.',
};

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-3xl font-black">Edit listing</h1>
      <p className="mt-2 text-muted">Update details, media metadata, contact information, and publish status.</p>
      <div className="mt-6"><ListingEditLoader id={id} /></div>
    </div>
  );
}
