import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Listing form progress" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
    <ol className="flex min-w-max gap-2 md:grid md:min-w-0 md:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? 'step' : undefined} className={cn('min-w-36 rounded-md border border-line bg-white p-3 text-sm font-semibold text-muted md:min-w-0', index === current && 'border-trust bg-emerald-50 text-trust', index < current && 'text-ink')}>
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs">{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
    </nav>
  );
}
