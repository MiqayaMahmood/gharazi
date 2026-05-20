'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { submitContact, submitFeedback, submitSupportRequest, type SubmissionInput } from '@/lib/api/submissions';

export function FeedbackForm({
  compact = false,
  submissionType = 'feedback',
  sourcePage = 'homepage',
}: {
  compact?: boolean;
  submissionType?: 'feedback' | 'contact' | 'support';
  sourcePage?: string;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const input: SubmissionInput = {
      name: String(formData.get('name') ?? '') || undefined,
      email: String(formData.get('email') ?? '') || undefined,
      phone: String(formData.get('phone') ?? '') || undefined,
      subject: String(formData.get('subject') ?? '') || undefined,
      category: String(formData.get('category') ?? '') || undefined,
      message: String(formData.get('message') ?? ''),
      website: String(formData.get('website') ?? '') || undefined,
      sourcePage,
      channel: submissionType === 'contact' ? 'contact_page' : submissionType === 'support' ? 'widget' : 'homepage',
    };
    try {
      if (submissionType === 'contact') await submitContact(input);
      else if (submissionType === 'support') await submitSupportRequest(input);
      else await submitFeedback(input);
      setSent(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Submission failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
          <h2 className={compact ? 'text-xl font-black' : 'text-2xl font-black'}>{submissionType === 'contact' ? 'Contact Gharazi' : submissionType === 'support' ? 'Support request' : 'Help improve Gharazi'}</h2>
      <p className="mt-2 text-sm text-muted">Submissions are stored for internal review and routed to admin/support staff.</p>
      {sent ? (
        <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-trust">Thanks. Your submission was received.</p>
      ) : (
        <form className="mt-4 grid gap-3" action={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="name" placeholder="Name optional" />
            <Input name="email" type="email" placeholder="Email optional" />
          </div>
          {submissionType !== 'feedback' ? <Input name="phone" placeholder="Phone optional" /> : null}
          {submissionType !== 'feedback' ? <Input name="subject" placeholder="Subject optional" /> : null}
          <Select name="category" defaultValue="suggestion">
            <option value="suggestion">Suggestion</option>
            <option value="bug">Bug report</option>
            <option value="support">Support</option>
            <option value="general">General</option>
          </Select>
          <input className="hidden" name="website" tabIndex={-1} autoComplete="off" />
          <textarea className="min-h-28 rounded-md border border-line bg-white p-3 text-sm" name="message" placeholder="Share your suggestion or issue" required />
                      <p className="text-xs leading-5 text-muted">By submitting, you agree that Gharazi may process this information to review and respond to your request. See the Privacy Policy.</p>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? 'Sending...' : submissionType === 'contact' ? 'Send message' : submissionType === 'support' ? 'Send support request' : 'Send feedback'}</Button>
        </form>
      )}
    </Card>
  );
}
