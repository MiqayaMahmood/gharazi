'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedContent } from '@/components/auth/protected-content';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/lib/query/hooks';
import { userRoleCodes } from '@/lib/auth/roles';

const nav = [
  ['Overview', '/dashboard'],
  ['Professional Dashboard', '/dashboard/professional'],
  ['Business Profile', '/dashboard/professional/profile'],
  ['Favorites', '/dashboard/favorites'],
  ['Bookmarks', '/dashboard/bookmarks'],
  ['Saved searches', '/dashboard/saved-searches'],
  ['Chats', '/dashboard/chats'],
  ['Notifications', '/dashboard/notifications'],
  ['Inquiries', '/dashboard/inquiries'],
  ['Profile', '/dashboard/profile'],
  ['Security', '/dashboard/security'],
  ['My listings', '/dashboard/listings'],
  ['My projects', '/dashboard/projects'],
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const isProfessional = userRoleCodes(user).some((role) => ['agent', 'developer', 'admin'].includes(role));

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border border-line bg-white p-3 shadow-soft">
          <div className="border-b border-line p-3">
            <p className="text-sm font-bold">Dashboard</p>
            <p className="mt-1 text-xs text-muted">{user?.phoneNumber ?? 'Authenticated area'}</p>
          </div>
          <nav className="mt-3 grid gap-1">
            {nav.map(([originalLabel, href]) => {
              const label = !isProfessional && href === '/dashboard/professional' ? 'Become a Professional' : !isProfessional && href === '/dashboard/professional/profile' ? 'Create Professional Profile' : originalLabel;
              return (
              <Link key={href} className={cn('rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-emerald-50 hover:text-ink', pathname === href && 'bg-emerald-50 text-trust')} href={href}>
                {label}
              </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <ProtectedContent>{children}</ProtectedContent>
    </div>
  );
}
