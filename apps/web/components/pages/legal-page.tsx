import { Card } from '@/components/ui/card';
import type { PolicySection } from '@/lib/policies/policy-content';

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: PolicySection[] }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl font-black">{title}</h1>
      <p className="mt-3 text-lg text-muted">{intro}</p>
      <p className="mt-3 rounded-lg border border-line bg-stone-50 p-4 text-sm text-muted">Draft policy content for public beta. This page is structured for later review by qualified legal counsel and should not be treated as final legal advice.</p>
      <div className="mt-8 grid gap-4">
        {sections.map((section) => (
          <Card key={section.heading} className="p-5">
            <h2 className="text-xl font-black">{section.heading}</h2>
            <p className="mt-2 leading-7 text-muted">{section.body}</p>
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                {section.bullets.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
