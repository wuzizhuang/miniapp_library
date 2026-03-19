export type RbacUserLike = {
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
};

const DASHBOARD_ROUTE_RULES: Array<{ prefix: string; permissions: string[]; adminOnly?: boolean }> = [
  { prefix: "/dashboard/settings", permissions: [], adminOnly: true },
  { prefix: "/dashboard/feedback", permissions: [], adminOnly: true },
  { prefix: "/dashboard/authors", permissions: [], adminOnly: true },
  { prefix: "/dashboard/categories", permissions: [], adminOnly: true },
  { prefix: "/dashboard/publishers", permissions: [], adminOnly: true },
  { prefix: "/dashboard/reviews", permissions: ["review:audit"] },
  { prefix: "/dashboard/users", permissions: ["user:manage"] },
  { prefix: "/dashboard/books", permissions: ["book:read", "book:write", "book:delete"] },
  { prefix: "/dashboard/loans", permissions: ["loan:read", "loan:write", "loan:manage"] },
  { prefix: "/dashboard/appointments", permissions: ["appointment:manage"] },
  { prefix: "/dashboard/reservations", permissions: ["reservation:manage"] },
  { prefix: "/dashboard/fines", permissions: ["fine:waive", "loan:manage"] },
  { prefix: "/dashboard", permissions: ["report:view"] },
];

function normalizeRoles(user?: RbacUserLike | null): string[] {
  const set = new Set<string>();

  if (user?.role) {
    set.add(user.role.toUpperCase());
  }

  for (const role of user?.roles ?? []) {
    if (role) {
      set.add(role.toUpperCase());
    }
  }

  if (set.size === 0) {
    set.add("USER");
  }

  return Array.from(set);
}

function normalizePermissions(user?: RbacUserLike | null): string[] {
  const set = new Set<string>();

  for (const permission of user?.permissions ?? []) {
    if (permission) {
      set.add(permission);
    }
  }

  return Array.from(set);
}

export function hasRole(user: RbacUserLike | null | undefined, role: string): boolean {
  return normalizeRoles(user).includes(role.toUpperCase());
}

export function hasAnyPermission(
  user: RbacUserLike | null | undefined,
  permissions: string[],
): boolean {
  if (permissions.length === 0) return true;
  if (hasRole(user, "ADMIN")) return true;

  const userPermissions = new Set(normalizePermissions(user));

  return permissions.some((permission) => userPermissions.has(permission));
}

export function canAccessAdminPanel(user: RbacUserLike | null | undefined): boolean {
  if (!user) return false;
  if (hasRole(user, "ADMIN")) return true;

  const permissions = normalizePermissions(user);

  return permissions.length > 0;
}

export function canAccessAdminRoute(
  pathname: string,
  user: RbacUserLike | null | undefined,
): boolean {
  if (!pathname.startsWith("/dashboard")) return true;
  if (!user) return false;
  if (hasRole(user, "ADMIN")) return true;

  const matchedRule = DASHBOARD_ROUTE_RULES.find((rule) => pathname.startsWith(rule.prefix));

  if (!matchedRule) return false;
  if (matchedRule.adminOnly) return false;

  return hasAnyPermission(user, matchedRule.permissions);
}

export function getDefaultAdminRoute(user: RbacUserLike | null | undefined): string {
  if (!user) return "/";
  if (hasRole(user, "ADMIN")) return "/dashboard";

  const checks: Array<{ route: string; permissions: string[] }> = [
    { route: "/dashboard", permissions: ["report:view"] },
    { route: "/dashboard/books", permissions: ["book:read", "book:write", "book:delete"] },
    { route: "/dashboard/loans", permissions: ["loan:read", "loan:write", "loan:manage"] },
    { route: "/dashboard/appointments", permissions: ["appointment:manage"] },
    { route: "/dashboard/reviews", permissions: ["review:audit"] },
    { route: "/dashboard/users", permissions: ["user:manage"] },
    { route: "/dashboard/reservations", permissions: ["reservation:manage"] },
    { route: "/dashboard/fines", permissions: ["fine:waive"] },
  ];

  const first = checks.find((item) => hasAnyPermission(user, item.permissions));

  return first?.route ?? "/";
}
