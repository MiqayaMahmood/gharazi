import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.terms.title,
  description: policies.terms.description,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalPage title={policies.terms.title} intro={policies.terms.intro} sections={policies.terms.sections} />;
}
