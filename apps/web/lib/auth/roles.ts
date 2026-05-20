import type { CurrentUser } from '@/lib/api/auth';

type RoleLike = string | { name?: string; code?: string; role?: RoleLike; roles?: RoleLike[] } | null | undefined;

function roleValues(role: RoleLike): string[] {
  if (!role) return [];
  if (typeof role === 'string') return [role];
  return [
    role.name,
    role.code,
    ...roleValues(role.role),
    ...(role.roles ?? []).flatMap(roleValues),
  ].filter((value): value is string => Boolean(value));
}

export function userRoleCodes(user?: Pick<CurrentUser, 'roles'> | null): string[] {
  return (user?.roles ?? [])
    .flatMap((role) => roleValues(role as RoleLike))
    .map((role) => role.toLowerCase().trim())
    .filter(Boolean);
}

export function hasRole(user: Pick<CurrentUser, 'roles'> | null | undefined, role: string): boolean {
  const requested = role.toLowerCase().trim();
  return userRoleCodes(user).some((candidate) => candidate === requested);
}

export function isAdmin(user: Pick<CurrentUser, 'roles'> | null | undefined): boolean {
  return hasRole(user, 'admin');
}
