import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.privacy.title,
  description: policies.privacy.description,
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return <LegalPage title={policies.privacy.title} intro={policies.privacy.intro} sections={policies.privacy.sections} />;
}
