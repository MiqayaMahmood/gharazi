'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { AdminIcon } from '@/components/admin/admin-icons';
import { logout } from '@/lib/api/auth';
import { isAdmin, userRoleCodes } from '@/lib/auth/roles';
import { useChats, useCurrentUser, useFavorites, useNotifications } from '@/lib/query/hooks';
import { useCompareStore, useUiStore } from '@/stores/ui-store';

const nav = [
  ['Buy', '/buy'],
  ['Rent', '/rent'],
  ['New Projects', '/projects'],
  ['Commercial', '/buy?propertyTypeCode=commercial'],
  ['Plots', '/buy?propertyTypeCode=plot'],
  ['Blog / Guides', '/blog'],
  ['About', '/about'],
  ['Contact', '/contact'],
];

export function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const { mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const { data: user } = useCurrentUser();
  const favorites = useFavorites();
  const chats = useChats();
  const notifications = useNotifications();
  const listingCompareCount = useCompareStore((state) => state.listingIds.length);
  const projectCompareCount = useCompareStore((state) => state.projectIds.length);
  const unreadNotifications = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const unreadChats = chats.data?.filter((item) => item.unread).length ?? 0;
  const admin = isAdmin(user);
  const professional = userRoleCodes(user).some((role) => ['agent', 'developer', 'admin'].includes(role));
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setAccountOpen(false);
      router.push('/');
    },
  });

  useEffect(() => {
    setAccountOpen(false);
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const accountLinks = (
    <>
      <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/dashboard"><AdminIcon name="dashboard" className="h-4 w-4" />My Dashboard</Link>
      <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/dashboard/professional"><AdminIcon name="users" className="h-4 w-4" />{professional ? 'Professional Dashboard' : 'Become a Professional'}</Link>
      {admin ? <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/admin"><AdminIcon name="shield" className="h-4 w-4" />Admin Dashboard</Link> : null}
      <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/dashboard/profile"><AdminIcon name="user" className="h-4 w-4" />Profile</Link>
      <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/favorites"><AdminIcon name="heart" className="h-4 w-4" />Saved {favorites.data?.length ? <Badge>{favorites.data.length}</Badge> : null}</Link>
      <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/dashboard/chats"><AdminIcon name="message" className="h-4 w-4" />Chat {unreadChats ? <Badge>{unreadChats}</Badge> : null}</Link>
      <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-emerald-50" href="/dashboard/notifications"><AdminIcon name="bell" className="h-4 w-4" />Alerts {unreadNotifications ? <Badge>{unreadNotifications}</Badge> : null}</Link>
      <button className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-emerald-50" onClick={() => signOut.mutate()} type="button"><AdminIcon name="logout" className="h-4 w-4" />Logout</button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
              <Link href="/" className="text-lg font-black tracking-normal text-ink">Gharazi.pk</Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-muted lg:flex">
          {nav.map(([label, href]) => <Link key={label} href={href} className="hover:text-ink">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link href={listingCompareCount ? '/compare/listings' : '/compare/projects'} className="text-sm font-semibold text-muted hover:text-ink">Compare {listingCompareCount + projectCompareCount ? <Badge>{listingCompareCount + projectCompareCount}</Badge> : null}</Link>
              <div className="relative" ref={menuRef}>
                <button aria-expanded={accountOpen} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink" onClick={() => setAccountOpen((open) => !open)} type="button">Account</button>
                {accountOpen ? <div className="absolute right-0 z-50 mt-2 grid w-64 gap-1 rounded-lg border border-line bg-white p-2 shadow-soft">{accountLinks}</div> : null}
              </div>
            </>
          ) : (
            <>
              <Button href="/login" asChild variant="ghost">Login</Button>
              <Button href="/register" asChild variant="secondary">Register</Button>
            </>
          )}
          <Button href={user ? '/dashboard/listings/new' : '/login?next=/dashboard/listings/new'} asChild>Post Property</Button>
        </div>
        <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold lg:hidden" onClick={() => setMobileMenuOpen(true)} type="button">Menu</button>
      </div>
      <Sheet open={mobileMenuOpen} title="Navigation" onClose={() => setMobileMenuOpen(false)}>
        <div className="grid gap-2">
          {nav.map(([label, href]) => <Link key={label} href={href} className="rounded-md px-3 py-3 font-semibold" onClick={() => setMobileMenuOpen(false)}>{label}</Link>)}
          {user ? (
            <>
              <Button href="/favorites" asChild variant="secondary">Saved</Button>
              <Button href="/dashboard/chats" asChild variant="secondary">Chats</Button>
              <Button href="/dashboard/notifications" asChild variant="secondary">Notifications</Button>
              {admin ? <Button href="/admin" asChild variant="secondary">Admin Dashboard</Button> : null}
              <Button href="/dashboard/profile" asChild variant="secondary">Profile</Button>
              <Button href="/dashboard" asChild variant="secondary">My Dashboard</Button>
              <Button href="/dashboard/professional" asChild variant="secondary">{professional ? 'Professional Dashboard' : 'Become a Professional'}</Button>
              <Button onClick={() => signOut.mutate()} variant="ghost">Logout</Button>
            </>
          ) : (
            <>
              <Button href="/login" asChild variant="secondary">Login</Button>
              <Button href="/register" asChild variant="secondary">Register</Button>
            </>
          )}
          <Button href={user ? '/dashboard/listings/new' : '/login?next=/dashboard/listings/new'} asChild>Post Property</Button>
        </div>
      </Sheet>
    </header>
  );
}
