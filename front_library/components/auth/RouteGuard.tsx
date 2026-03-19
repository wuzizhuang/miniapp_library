import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";

import { useAuth } from "@/config/authContext";
import { User } from "@/types/auth";
import { canAccessAdminPanel, getDefaultAdminRoute } from "@/utils/rbac";

const PROTECTED_PREFIXES = ["/my", "/dashboard"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getPostLoginRouteForUser(user: User): string {
  if (canAccessAdminPanel(user)) {
    return getDefaultAdminRoute(user);
  }

  return "/my/shelf";
}

function hasExplicitLogoutMarker(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem("auth:logged_out") === "1";
}

function clearExplicitLogoutMarker() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem("auth:logged_out");
}

export default function RouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const { pathname } = router;
    const explicitLogout = hasExplicitLogoutMarker();

    if (!user && isProtectedPath(pathname)) {
      if (explicitLogout) {
        clearExplicitLogoutMarker();
        router.replace("/auth/login");

        return;
      }

      const redirect = router.asPath || pathname;

      router.replace({
        pathname: "/auth/login",
        query: { redirect },
      });

      return;
    }

    if (!user && pathname === "/auth/login") {
      clearExplicitLogoutMarker();
    }

    if (user && pathname === "/auth/login") {
      clearExplicitLogoutMarker();
      const nextPath = getPostLoginRouteForUser(user);

      if (nextPath !== pathname) {
        router.replace(nextPath);
      }
    }
  }, [isLoading, user, router]);

  return <>{children}</>;
}
