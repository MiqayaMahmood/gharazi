import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.advertisingDisclaimer.title,
  description: policies.advertisingDisclaimer.description,
  alternates: { canonical: '/advertising-disclaimer' },
};

export default function AdvertisingDisclaimerPage() {
  return <LegalPage title={policies.advertisingDisclaimer.title} intro={policies.advertisingDisclaimer.intro} sections={policies.advertisingDisclaimer.sections} />;
}
