import Link from 'next/link';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema } from '@/lib/seo/structured-data';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <><JsonLd data={breadcrumbSchema(items)} /><nav aria-label="Breadcrumb" className="mb-5 overflow-x-auto">
      <ol className="flex min-w-0 items-center gap-2 text-sm font-semibold text-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="text-line">/</span> : null}
              {item.href && !current ? (
                <Link href={item.href} className="whitespace-nowrap hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate whitespace-nowrap text-ink" aria-current={current ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav></>
  );
}
