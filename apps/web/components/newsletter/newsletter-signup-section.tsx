'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { subscribeNewsletter } from '@/lib/api/newsletter';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';

export function NewsletterSignupSection() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await subscribeNewsletter({
        email: String(form.get('email') ?? ''),
        name: String(form.get('name') ?? '') || undefined,
        city: String(form.get('city') ?? '') || undefined,
        interestsJson: { source: 'footer_newsletter' },
        sourcePage: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      setStatus('success');
      setMessage(response.message);
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
      setMessage(getUserFriendlyErrorMessage(error));
    }
  }

  return (
    <section className="border-t border-line bg-emerald-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-200">Property insights</p>
          <h2 className="mt-2 text-2xl font-black">Get market updates and new project alerts</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">Subscribe for area guides, project updates, and practical property tips from Gharazi. You can unsubscribe later.</p>
        </div>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={submit}>
          <Input className="bg-white text-ink" name="email" type="email" placeholder="Email address" required />
          <Input className="bg-white text-ink" name="name" placeholder="Name optional" />
          <Input className="bg-white text-ink" name="city" placeholder="City optional" />
          <Button type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Subscribing' : 'Subscribe'}</Button>
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-emerald-100">
            By subscribing, you agree that Gharazi may process your email for updates. See our <Link className="font-bold underline" href="/privacy-policy">Privacy Policy</Link>.
          </p>
          {message ? <p className={`sm:col-span-2 lg:col-span-4 text-sm font-semibold ${status === 'error' ? 'text-red-200' : 'text-emerald-100'}`}>{message}</p> : null}
        </form>
      </div>
    </section>
  );
}
