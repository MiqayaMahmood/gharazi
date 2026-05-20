import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="grid gap-2 md:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step} className={cn('rounded-md border border-line bg-white p-3 text-sm font-semibold text-muted', index === current && 'border-trust bg-emerald-50 text-trust', index < current && 'text-ink')}>
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs">{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
