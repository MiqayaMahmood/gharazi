import type { Metadata } from 'next';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { ProjectComparisonClient } from '@/components/compare/project-comparison-client';
import { ToolDisclaimer } from '@/components/legal/disclaimers';

export const metadata: Metadata = {
  title: 'Compare projects',
  description: 'Compare project transparency, payment plans, and possession status.',
};

export default function CompareProjectsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <ViewTracker eventType="tool_viewed" entityType="tool" metadataJson={{ tool: 'compare-projects' }} />
      <h1 className="text-3xl font-black">Compare projects</h1>
      <p className="mt-2 text-muted">Evaluate developer, legal status, possession, units, and payment-plan clarity.</p>
      <ToolDisclaimer className="mt-5" />
      <div className="mt-6"><ProjectComparisonClient /></div>
    </div>
  );
}
