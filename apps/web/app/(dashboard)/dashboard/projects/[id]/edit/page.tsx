import type { Metadata } from 'next';
import { ProjectEditLoader } from '@/components/forms/project-edit-loader';

export const metadata: Metadata = {
  title: 'Edit project',
  description: 'Edit project details, units, updates, and publishing status.',
};

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-3xl font-black">Edit project</h1>
      <p className="mt-2 text-muted">Keep project transparency current with units, updates, and payment details.</p>
      <div className="mt-6"><ProjectEditLoader id={id} /></div>
    </div>
  );
}
