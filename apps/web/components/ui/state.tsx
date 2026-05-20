export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200 ${className}`} />;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="text-xl font-bold text-red-900">{title}</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
