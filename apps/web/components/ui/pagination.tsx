import { Button } from './button';

export function Pagination({ page, total, pageSize = 12 }: { page: number; total: number; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <span className="text-sm text-muted">Page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1}>Previous</Button>
        <Button variant="secondary" disabled={page >= pages}>Next</Button>
      </div>
    </nav>
  );
}
