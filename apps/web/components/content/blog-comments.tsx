'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BlogComment } from '@/lib/wordpress/types';
import { formatDate } from '@/lib/utils';

export function BlogComments({ postId, comments }: { postId: number; comments: BlogComment[] }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    const response = await fetch('/api/blog/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, name, email, message }),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    setName('');
    setEmail('');
    setMessage('');
    setStatus('success');
  }

  return (
    <Card className="mt-10 p-5">
      <h2 className="text-xl font-black">Reader remarks</h2>
      <p className="mt-2 text-sm text-muted">Comments are submitted to WordPress and may require moderation before appearing.</p>
      <div className="mt-5 grid gap-4">
        {comments.length === 0 ? <p className="rounded-lg bg-stone-50 p-4 text-sm text-muted">No remarks yet. Be the first to add one.</p> : null}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{comment.authorName}</p>
              <p className="text-xs text-muted">{formatDate(comment.createdAt)}</p>
            </div>
            <div className="mt-2 text-sm leading-7 text-muted" dangerouslySetInnerHTML={{ __html: comment.contentHtml }} />
          </div>
        ))}
      </div>
      <form className="mt-6 grid gap-3" onSubmit={submitComment}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            Name
            <Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Email
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          Remark
          <textarea className="min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm" value={message} onChange={(event) => setMessage(event.target.value)} required minLength={5} />
        </label>
        {status === 'success' ? <p className="text-sm font-semibold text-trust">Remark submitted. It will appear after approval if moderation is enabled.</p> : null}
        {status === 'error' ? <p className="text-sm font-semibold text-red-700">We could not submit your remark right now. Please try again later.</p> : null}
        <Button disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting...' : 'Submit remark'}</Button>
      </form>
    </Card>
  );
}
