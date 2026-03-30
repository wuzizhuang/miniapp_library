// context/auth-context.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/router";
import { toast } from "sonner"; // 假设你用了 sonner 或其他 toast 库

import { User } from "@/types/auth";
import { ApiAuthResponse } from "@/types/api";
import { authService } from "@/services/api/authService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (payload: ApiAuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const normalizeUser = (rawUser: Partial<User> | null) => {
    if (!rawUser) return null;
    const normalizedRoles = Array.from(
      new Set(
        [
          ...(rawUser.roles ?? []),
          rawUser.role,
        ]
          .filter(Boolean)
          .map((role) => String(role).toUpperCase()),
      ),
    );

    return {
      userId: rawUser.userId ?? 0,
      username: rawUser.username ?? "guest",
      email: rawUser.email ?? "guest@library.local",
      fullName: rawUser.fullName ?? rawUser.username ?? "Guest",
      role: rawUser.role ?? normalizedRoles[0] ?? "USER",
      roles: normalizedRoles.length > 0 ? normalizedRoles : ["USER"],
      permissions: rawUser.permissions ?? [],
      avatar: rawUser.avatar,
    } as User;
  };

  const clearSession = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const markExplicitLogout = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("auth:logged_out", "1");
  };

  const setStoredUser = (nextUser: User | null) => {
    if (typeof window === "undefined") return;
    if (!nextUser) {
      localStorage.removeItem("user");

      return;
    }
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const setSessionFromLoginPayload = (payload: ApiAuthResponse) => {
    if (typeof window === "undefined") return;

    const normalizedUser = normalizeUser({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      roles: payload.roles,
      permissions: payload.permissions,
      email: `${payload.username}@library.local`,
      fullName: payload.username,
    });

    localStorage.setItem("token", payload.token);

    if (normalizedUser) {
      setStoredUser(normalizedUser);
      setUser(normalizedUser);
    }
  };

  // 初始化检查登录状态
  useEffect(() => {
    void checkAuth();
     
  }, []);

  const checkAuth = async () => {
    if (typeof window === "undefined") {
      setIsLoading(false);

      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      clearSession();
      setUser(null);
      setIsLoading(false);

      return;
    }

    try {
      const userData = await authService.getContext();

      const normalizedUser = normalizeUser(userData);

      setUser(normalizedUser);
      setStoredUser(normalizedUser);
    } catch {
      try {
        const userData = await authService.getMe();
        const normalizedUser = normalizeUser(userData);

        setUser(normalizedUser);
        setStoredUser(normalizedUser);
      } catch {
        clearSession();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (payload: ApiAuthResponse) => {
    setSessionFromLoginPayload(payload);
    await checkAuth();
  };

  const logout = async () => {
    markExplicitLogout();
    try {
      await authService.loginOut();
    } catch {
      // Continue local logout even if backend logout fails.
    }
    setUser(null);
    clearSession();
    try {
      await router.replace("/auth/login");
    } catch {
      if (typeof window !== "undefined") {
        window.location.assign("/auth/login");

        return;
      }
    }
    toast.success("已安全退出");
  };

  const updateProfile = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...updates };

      setStoredUser(nextUser);

      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, checkAuth, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
