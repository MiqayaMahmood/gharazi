import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.neutrality.title,
  description: policies.neutrality.description,
  alternates: { canonical: '/platform-neutrality' },
};

export default function PlatformNeutralityPage() {
  return <LegalPage title={policies.neutrality.title} intro={policies.neutrality.intro} sections={policies.neutrality.sections} />;
}
