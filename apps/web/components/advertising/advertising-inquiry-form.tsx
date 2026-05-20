'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { submitContact, type SubmissionInput } from '@/lib/api/submissions';
import { advertisingPackages, audienceLabels, type AdvertisingAudience } from '@/lib/advertising/packages';

export function AdvertisingInquiryForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const advertiserType = String(formData.get('advertiserType') ?? '');
    const interestedPackage = String(formData.get('interestedPackage') ?? '');
    const company = String(formData.get('company') ?? '');
    const city = String(formData.get('city') ?? '');
    const message = String(formData.get('message') ?? '');
    const input: SubmissionInput = {
      name: String(formData.get('name') ?? '') || undefined,
      email: String(formData.get('email') ?? '') || undefined,
      phone: String(formData.get('phone') ?? '') || undefined,
      subject: `Advertising inquiry: ${interestedPackage || advertiserType || 'general'}`,
      category: 'advertising',
      sourcePage: '/advertise',
      channel: 'contact_page',
      priority: 'normal',
      website: String(formData.get('website') ?? '') || undefined,
      message: [
        `Advertiser type: ${advertiserType || 'not specified'}`,
        `Interested package: ${interestedPackage || 'not specified'}`,
        `Company/agency/developer: ${company || 'not specified'}`,
        `City/market: ${city || 'not specified'}`,
        '',
        message,
      ].join('\n'),
    };
    try {
      await submitContact(input);
      setSent(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Submission failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5" id="advertising-inquiry">
      <h2 className="text-2xl font-black">Request an advertising plan</h2>
      <p className="mt-2 text-sm text-muted">Tell us what you want to promote. The sales/support team will follow up with package availability and pricing.</p>
      {sent ? (
        <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-trust">Thanks. Your advertising inquiry was received.</p>
      ) : (
        <form className="mt-5 grid gap-3" action={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="name" placeholder="Full name" required />
            <Input name="phone" placeholder="Phone" required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="email" type="email" placeholder="Email optional" />
            <Input name="company" placeholder="Company / agency / developer optional" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select name="advertiserType" defaultValue="agency">
              {(['individuals', 'agencies', 'developers', 'sponsored'] as AdvertisingAudience[]).map((type) => <option key={type} value={type}>{audienceLabels[type]}</option>)}
            </Select>
            <Select name="interestedPackage" defaultValue="growth-agency">
              {advertisingPackages.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              <option value="Sponsored placement">Sponsored placement</option>
              <option value="Custom package">Custom package</option>
            </Select>
          </div>
          <Input name="city" placeholder="City / market, e.g. Lahore, Karachi, Islamabad" />
          <input className="hidden" name="website" tabIndex={-1} autoComplete="off" />
          <textarea className="min-h-28 rounded-md border border-line bg-white p-3 text-sm" name="message" placeholder="Tell us your inventory, launch timing, target city, or campaign goal" required />
                      <p className="text-xs text-muted">By submitting, you agree that Gharazi may contact you about advertising and partnership options. Pricing is confirmed by sales during beta.</p>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? 'Sending...' : 'Send advertising inquiry'}</Button>
        </form>
      )}
    </Card>
  );
}
