'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackForm } from '@/components/feedback/feedback-form';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  return (
    <>
      <button
        className="fixed bottom-20 right-4 z-40 rounded-full bg-ink px-4 py-3 text-sm font-black text-white shadow-soft"
        onClick={() => setOpen(true)}
        type="button"
      >
        Need help?
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 p-4">
          <button className="absolute inset-0 h-full w-full cursor-default" aria-label="Close support" onClick={() => setOpen(false)} type="button" />
          <Card className="absolute bottom-6 right-4 z-10 w-[calc(100%-2rem)] max-w-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Platform support</h2>
                              <p className="mt-2 text-sm text-muted">This is support for Gharazi.pk, separate from buyer-agent chat.</p>
              </div>
              <button className="text-sm font-bold" onClick={() => setOpen(false)} type="button">Close</button>
            </div>
            {showForm ? <div className="mt-5"><FeedbackForm compact submissionType="support" sourcePage="support_widget" /></div> : (
            <div className="mt-5 grid gap-2">
              <Button onClick={() => setShowForm(true)}>Contact support</Button>
              <Button asChild href="/contact#feedback" variant="secondary">Send feedback</Button>
              <Button asChild href="mailto:info@gharazi.pk" variant="secondary">Email us</Button>
              <Link className="rounded-md px-3 py-2 text-sm font-bold text-trust" href="/about">How Gharazi works</Link>
            </div>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
