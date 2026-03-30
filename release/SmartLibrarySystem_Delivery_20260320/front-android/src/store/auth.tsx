import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { ApiLoginRequest } from "../types/api";
import type { AuthUser } from "../types/auth";
import { authService } from "../services/auth";
import { registerTokenRefreshHandler, registerUnauthorizedHandler } from "../services/http";
import { emitAppEvent } from "../utils/events";
import {
  clearSessionStorage,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUser,
  setStoredRefreshToken,
  setStoredToken,
  setStoredUser,
} from "../utils/storage";

interface AuthContextValue {
  isBootstrapping: boolean;
  isSigningIn: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (payload: ApiLoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (token: string, user: AuthUser, refreshToken?: string | null) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    registerUnauthorizedHandler(() => signOut(true));
    registerTokenRefreshHandler(() => refreshAccessToken());

    async function bootstrap() {
      const storedToken = await getStoredToken();

      if (!storedToken) {
        setToken(null);
        setUser(null);
        setIsBootstrapping(false);
        return;
      }

      try {
        const nextUser = await authService.bootstrapFromToken(storedToken);
        await setStoredUser(nextUser);
        setToken(storedToken);
        setUser(nextUser);
      } catch {
        const cachedUser = await getStoredUser();

        if (cachedUser) {
          setToken(storedToken);
          setUser(cachedUser);
        } else {
          await clearSessionStorage();
          setToken(null);
          setUser(null);
        }
      }

      setIsBootstrapping(false);
    }

    void bootstrap();

    return () => {
      registerUnauthorizedHandler(null);
      registerTokenRefreshHandler(null);
    };
  }, []);

  async function setSession(nextToken: string, nextUser: AuthUser, nextRefreshToken?: string | null) {
    const writes: Array<Promise<void>> = [setStoredToken(nextToken), setStoredUser(nextUser)];
    if (nextRefreshToken) {
      writes.push(setStoredRefreshToken(nextRefreshToken));
    }

    await Promise.all(writes);
    setToken(nextToken);
    setUser(nextUser);
    emitAppEvent("auth");
  }

  async function signIn(payload: ApiLoginRequest) {
    setIsSigningIn(true);

    try {
      const { session, user: nextUser } = await authService.loginAndBootstrap(payload);
      await setSession(session.token, nextUser, session.refreshToken);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut(skipRemote = false) {
    if (!skipRemote) {
      const refreshToken = await getStoredRefreshToken();
      await authService.logout(refreshToken ?? undefined);
    }
    await clearSessionStorage();
    setToken(null);
    setUser(null);
    emitAppEvent("auth");
  }

  async function refreshSession() {
    const storedToken = await getStoredToken();

    if (!storedToken) {
      await signOut(true);
      return;
    }

    const nextUser = await authService.bootstrapFromToken(storedToken);
    await setStoredUser(nextUser);
    setToken(storedToken);
    setUser(nextUser);
    emitAppEvent("auth");
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      const storedRefreshToken = await getStoredRefreshToken();

      if (!storedRefreshToken) {
        await signOut(true);
        return null;
      }

      try {
        const session = await authService.refresh(storedRefreshToken);
        await setStoredToken(session.token);
        if (session.refreshToken) {
          await setStoredRefreshToken(session.refreshToken);
        }
        setToken(session.token);
        emitAppEvent("auth");
        return session.token;
      } catch {
        await signOut(true);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }

  const value = useMemo(
    () => ({
      isBootstrapping,
      isSigningIn,
      token,
      user,
      signIn,
      signOut,
      setSession,
      refreshSession,
    }),
    [isBootstrapping, isSigningIn, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
