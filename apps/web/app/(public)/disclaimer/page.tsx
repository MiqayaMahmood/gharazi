import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.disclaimer.title,
  description: policies.disclaimer.description,
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return <LegalPage title={policies.disclaimer.title} intro={policies.disclaimer.intro} sections={policies.disclaimer.sections} />;
}
