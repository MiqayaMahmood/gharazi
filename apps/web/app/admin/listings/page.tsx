import { AdminResourceClient } from '@/components/admin/admin-resource-client';
import { AdminListingExpiryPanel } from '@/components/admin/admin-listing-expiry-panel';

export const metadata = { title: 'Admin Listings' };

export default function AdminListingsPage() {
  return <>
    <AdminListingExpiryPanel />
    <AdminResourceClient resource="listings" />
  </>;
}
