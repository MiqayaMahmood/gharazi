import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.cookies.title,
  description: policies.cookies.description,
  alternates: { canonical: '/cookie-policy' },
};

export default function CookiePolicyPage() {
  return <LegalPage title={policies.cookies.title} intro={policies.cookies.intro} sections={policies.cookies.sections} />;
}
