import { Card } from '@/components/ui/card';
import { formatDate, formatPrice } from '@/lib/utils';
import type { Project } from '@/types/marketplace';

export function InvestmentSummary({ project }: { project: Project }) {
  const range = project.minPriceAmount && project.maxPriceAmount ? project.maxPriceAmount - project.minPriceAmount : null;
  return (
    <section className="grid gap-3 md:grid-cols-4">
      <Card className="p-4">
        <p className="text-sm text-muted">Entry price</p>
        <p className="mt-2 text-xl font-black">{formatPrice(project.minPriceAmount)}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted">Price spread</p>
        <p className="mt-2 text-xl font-black">{range ? formatPrice(range) : 'On request'}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted">Possession clarity</p>
        <p className="mt-2 text-xl font-black">{project.possessionStatus ?? 'Pending'}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted">Handover</p>
        <p className="mt-2 text-xl font-black">{formatDate(project.expectedHandoverDate)}</p>
      </Card>
    </section>
  );
}
