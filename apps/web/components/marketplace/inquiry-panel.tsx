import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const prompts = ['Is this still available?', 'Can I schedule a visit?', 'What is the final price?', 'Please share more details.'];

export function InquiryPanel({ subject }: { subject: string }) {
  return (
    <Card id="inquiry" className="sticky top-20 grid gap-4 p-4">
      <div>
        <h2 className="text-lg font-black">Contact safely</h2>
        <p className="text-sm text-muted">Start with a guided inquiry. Chat wiring can attach to this panel in the next sprint.</p>
      </div>
      <div className="grid gap-2">
        {prompts.map((prompt) => <button key={prompt} className="rounded-md border border-line bg-white px-3 py-2 text-left text-sm font-semibold hover:bg-emerald-50" type="button">{prompt}</button>)}
      </div>
      <Button>Send inquiry</Button>
      <Button variant="secondary">Start chat</Button>
      <p className="text-xs text-muted">Reference: {subject}</p>
    </Card>
  );
}
