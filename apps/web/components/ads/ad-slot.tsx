import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AdSlotProps = {
  slot: string;
  title?: string;
  description?: string;
  href?: string;
  variant?: 'hero' | 'inline' | 'sidebar' | 'sponsored-card';
  className?: string;
};

const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export function AdSlot({ slot, title = 'Featured campaign', description = 'Promote verified inventory, projects, or guides without disrupting search.', href = '/contact', variant = 'inline', className }: AdSlotProps) {
  if (!adsEnabled) {
    return (
      <Card className={cn('border-dashed p-4', variant === 'sidebar' && 'hidden lg:block', className)}>
        <Badge className="border-stone-200 bg-stone-100 text-muted">Advertisement</Badge>
        <h3 className="mt-3 font-black">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
        <a className="mt-3 inline-block text-sm font-bold text-trust" href={href}>Learn about sponsored placements</a>
      </Card>
    );
  }

  if (adsenseClient) {
    return (
      <div className={cn('rounded-lg border border-line bg-white p-3', variant === 'sidebar' && 'hidden lg:block', className)}>
        <span className="mb-2 block text-xs font-bold text-muted">Advertisement</span>
        <ins
          className="adsbygoogle block min-h-24"
          data-ad-client={adsenseClient}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return null;
}

export function HeroAdSlot() {
  return <AdSlot slot="hero" variant="hero" title="Verified developer campaign" description="A controlled hero campaign area for trusted builders and launch offers." />;
}

export function InlineAdSlot() {
  return <AdSlot slot="inline" variant="inline" title="Sponsored spotlight" description="Reserved for house campaigns or future AdSense units when enabled." />;
}

export function SidebarAdSlot() {
    return <AdSlot slot="sidebar" variant="sidebar" title="Advertise on Gharazi" description="Reach high-intent buyers and renters in a restrained placement." />;
}
