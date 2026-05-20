import type { Metadata } from 'next';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Contact Gharazi Pakistan',
  description: 'Contact Gharazi.pk support, send beta feedback, or ask about sponsored placements.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-black">Contact and support</h1>
      <p className="mt-3 max-w-3xl text-lg text-muted">Use this page for platform support, beta feedback, sponsorship inquiries, and general questions. Marketplace user-to-user chat remains inside listing and project inquiry flows.</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4">
          <Card className="p-5">
            <h2 className="text-xl font-black">Support</h2>
                <p className="mt-2 text-sm text-muted">Email: info@gharazi.com</p>
                 <p className="mt-1 text-sm text-muted">Business: info@fharazi.com</p>
                  <Button className="mt-4" asChild href="mailto:info@gharazi.com">Email support</Button>
          </Card>
          <Card className="p-5" id="faq">
            <h2 className="text-xl font-black">FAQ teaser</h2>
            <p className="mt-2 text-sm text-muted">How do I post a property? Login with OTP, open dashboard, and use Add Listing.</p>
            <p className="mt-2 text-sm text-muted">Is live support available? Not yet. The support widget routes to email and feedback during beta.</p>
          </Card>
        </div>
        <div id="feedback">
          <FeedbackForm submissionType="contact" sourcePage="contact_page" />
        </div>
      </div>
    </div>
  );
}
