import type { Metadata } from 'next';
import { ProjectFormClient } from '@/components/forms/project-form-client';

export const metadata: Metadata = {
  title: 'Add project',
  description: 'Create a transparent real-estate project draft.',
};

export default function NewProjectPage() {
  return (
    <div>
      <h1 className="text-3xl font-black">Add project</h1>
      <p className="mt-2 text-muted">Capture project facts, payment plans, units, media, and progress updates.</p>
      <div className="mt-6"><ProjectFormClient /></div>
    </div>
  );
}
