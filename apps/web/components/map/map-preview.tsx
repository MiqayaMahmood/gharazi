import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type MapItem = {
  id: string;
  title: string;
  areaName?: string;
  cityName?: string;
  latitude?: number;
  longitude?: number;
  priceLabel?: string;
};

export function MapPreview({ items, title = 'Map preview' }: { items: MapItem[]; title?: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-[420px] flex-col bg-[linear-gradient(135deg,#e8f4ee_0%,#f8faf8_45%,#dfece8_100%)]">
        <div className="flex items-center justify-between border-b border-line bg-white/80 p-4">
          <div>
            <h2 className="font-black">{title}</h2>
            <p className="text-sm text-muted">Geo filtering is ready for deeper backend viewport support.</p>
          </div>
          <Badge>{items.length} markers</Badge>
        </div>
        <div className="relative flex-1 p-5">
          <div className="absolute inset-x-8 top-1/3 h-px bg-emerald-200" />
          <div className="absolute inset-y-8 left-1/2 w-px bg-emerald-200" />
          <div className="grid h-full gap-3 sm:grid-cols-2">
            {items.slice(0, 6).map((item, index) => (
              <div key={item.id} className="self-start rounded-lg border border-emerald-200 bg-white p-3 shadow-soft" style={{ marginTop: `${(index % 3) * 22}px` }}>
                <p className="text-xs font-black text-trust">Marker {index + 1}</p>
                <p className="mt-1 text-sm font-bold">{item.title}</p>
                <p className="text-xs text-muted">{item.areaName}, {item.cityName}</p>
                {item.priceLabel ? <p className="mt-1 text-xs font-bold">{item.priceLabel}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
