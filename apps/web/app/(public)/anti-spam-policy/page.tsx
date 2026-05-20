import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/legal-page';
import { policies } from '@/lib/policies/policy-content';

export const metadata: Metadata = {
  title: policies.antiSpam.title,
  description: policies.antiSpam.description,
  alternates: { canonical: '/anti-spam-policy' },
};

export default function AntiSpamPolicyPage() {
  return <LegalPage title={policies.antiSpam.title} intro={policies.antiSpam.intro} sections={policies.antiSpam.sections} />;
}
