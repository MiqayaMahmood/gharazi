'use client';

import { Button } from './button';
import { Select } from './input';

const pageSizeOptions = [20, 40, 80, 1000];

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pages = visiblePages(currentPage, totalPages);
  const start = total ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(total, currentPage * pageSize);

  return (
    <nav className="grid gap-3 rounded-lg border border-line bg-white p-3 sm:flex sm:items-center sm:justify-between" aria-label="Pagination">
      <div className="text-sm font-semibold text-muted">
        Showing {start}-{end} of {total} · Page {currentPage} of {totalPages}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(1)} aria-label="First page">First</Button>
        <Button type="button" variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">Previous</Button>
        {pages.map((item) => (
          <Button
            key={item}
            type="button"
            variant={item === currentPage ? 'primary' : 'secondary'}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? 'page' : undefined}
          >
            {item}
          </Button>
        ))}
        <Button type="button" variant="secondary" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">Next</Button>
        <Button type="button" variant="secondary" disabled={currentPage >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">Last</Button>
        <Select aria-label="Items per page" value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
        </Select>
      </div>
    </nav>
  );
}

function visiblePages(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
