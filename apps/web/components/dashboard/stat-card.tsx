import { Card } from '@/components/ui/card';

export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {detail ? <p className="mt-2 text-sm text-muted">{detail}</p> : null}
    </Card>
  );
}
