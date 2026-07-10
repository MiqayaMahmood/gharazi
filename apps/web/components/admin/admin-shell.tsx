'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/state';
import { Sheet } from '@/components/ui/sheet';
import { AdminIcon, type AdminIconName } from './admin-icons';
import { isAdmin } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/lib/query/hooks';

export const adminNav: Array<{ label: string; href: string; icon: AdminIconName }> = [
  { label: 'Overview', href: '/admin', icon: 'overview' },
  { label: 'System Health', href: '/admin/system-health', icon: 'shield' },
  { label: 'System Events', href: '/admin/system-events', icon: 'warning' },
  { label: 'Users', href: '/admin/users', icon: 'users' },
  { label: 'Listings', href: '/admin/listings', icon: 'home' },
  { label: 'Projects', href: '/admin/projects', icon: 'dashboard' },
  { label: 'Professionals', href: '/admin/professionals', icon: 'users' },
  { label: 'Reports', href: '/admin/reports', icon: 'warning' },
  { label: 'Verification', href: '/admin/verification-requests', icon: 'shield' },
  { label: 'Submissions', href: '/admin/submissions', icon: 'message' },
  { label: 'Promotions', href: '/admin/promotions', icon: 'chart' },
  { label: 'Advertising', href: '/admin/advertising', icon: 'chart' },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: 'money' },
  { label: 'Payments', href: '/admin/payments', icon: 'money' },
  { label: 'Analytics', href: '/admin/analytics', icon: 'chart' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'file' },
  { label: 'CMS Pages', href: '/admin/cms/pages', icon: 'file' },
  { label: 'Blog Posts', href: '/admin/cms/blog-posts', icon: 'file' },
  { label: 'Risk Flags', href: '/admin/risk-flags', icon: 'warning' },
  { label: 'Data Integrity', href: '/admin/data-integrity', icon: 'shield' },
  { label: 'Search Ops', href: '/admin/search-ops', icon: 'search' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <Card className="mx-auto my-10 max-w-xl p-8 text-center">
        <h1 className="text-2xl font-black">Admin login required</h1>
        <p className="mt-2 text-sm text-muted">Sign in with an Admin account to continue.</p>
        <Button className="mt-6" href={`/login?next=${encodeURIComponent(pathname)}`} asChild>Login</Button>
      </Card>
    );
  }

  if (!isAdmin(user)) {
    return (
      <Card className="mx-auto my-10 max-w-xl p-8 text-center">
        <h1 className="text-2xl font-black">Access denied</h1>
        <p className="mt-2 text-sm text-muted">Your account does not have permission to access the Admin Dashboard.</p>
        <Button className="mt-6" href="/dashboard" asChild>Return to dashboard</Button>
      </Card>
    );
  }

  const sidebar = (
    <nav className="grid gap-1">
      {adminNav.map((item) => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-emerald-50 hover:text-ink', active && 'bg-emerald-50 text-trust')}
          >
            <AdminIcon name={item.icon} className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-trust">Admin</p>
            <h1 className="text-xl font-black text-ink">Gharazi Operations</h1>
          </div>
          <Button className="lg:hidden" variant="secondary" onClick={() => setOpen(true)}>Menu</Button>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[270px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-lg border border-line bg-white p-3 shadow-soft">{sidebar}</div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
      <Sheet open={open} title="Admin navigation" onClose={() => setOpen(false)}>
        {sidebar}
      </Sheet>
    </div>
  );
}
