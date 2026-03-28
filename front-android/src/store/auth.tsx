/**
 * @file 认证状态管理（React Context）
 * @description 提供全局认证上下文，管理用户会话的完整生命周期：
 *
 *   核心功能：
 *   1. 应用启动引导（bootstrap）：从本地存储恢复 token → 验证 → 设置用户
 *   2. 登录（signIn）：调用认证服务 → 保存会话 → 更新上下文
 *   3. 登出（signOut）：调用后端登出 → 清空存储 → 重置上下文
 *   4. 会话刷新（refreshSession）：重新获取用户信息
 *   5. 令牌刷新（refreshAccessToken）：使用 refreshToken 获取新 token
 *
 *   去重机制：
 *   - refreshAccessToken 使用 useRef 存储 Promise 引用，
 *     确保并发调用只发起一次实际请求
 *
 *   全局副作用注册：
 *   - 挂载时注册 HTTP 层的 401 处理器和令牌刷新处理器
 *   - 卸载时注销（防止内存泄漏）
 */

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

/** 认证上下文值的类型定义 */
interface AuthContextValue {
  isBootstrapping: boolean;     // 是否正在启动引导
  isSigningIn: boolean;         // 是否正在登录中
  token: string | null;         // 当前访问令牌
  user: AuthUser | null;        // 当前用户信息
  signIn: (payload: ApiLoginRequest) => Promise<void>;       // 登录方法
  signOut: () => Promise<void>;                               // 登出方法
  setSession: (token: string, user: AuthUser, refreshToken?: string | null) => Promise<void>;  // 设置会话
  refreshSession: () => Promise<void>;                        // 刷新会话
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * 认证上下文提供者
 * 包裹在应用根组件，为所有子组件提供认证状态和操作方法
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  /** 令牌刷新去重引用：同一时间最多一个刷新请求在执行 */
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  /**
   * 初始化副作用
   * 1. 注册 HTTP 层的全局处理器
   * 2. 执行启动引导流程
   */
  useEffect(() => {
    // 注册 401 未授权处理器：静默登出
    registerUnauthorizedHandler(() => signOut(true));
    // 注册令牌刷新处理器：HTTP 层遇到 401 时自动尝试刷新
    registerTokenRefreshHandler(() => refreshAccessToken());

    /**
     * 启动引导流程
     * 尝试从本地存储恢复会话：
     *   1. 读取 token → 为空则跳过
     *   2. 用 token 调用后端验证（bootstrapFromToken）
     *   3. 验证成功 → 更新状态
     *   4. 验证失败 → 尝试使用缓存用户（离线容错）
     *   5. 无缓存 → 清空存储
     */
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
        // 后端不可达时回退到本地缓存
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

    // 清理：注销全局处理器
    return () => {
      registerUnauthorizedHandler(null);
      registerTokenRefreshHandler(null);
    };
  }, []);

  /**
   * 保存会话信息
   * 同步更新：本地存储 + React 状态 + 事件通知
   */
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

  /**
   * 登录
   * 调用 authService.loginAndBootstrap → 保存会话
   */
  async function signIn(payload: ApiLoginRequest) {
    setIsSigningIn(true);

    try {
      const { session, user: nextUser } = await authService.loginAndBootstrap(payload);
      await setSession(session.token, nextUser, session.refreshToken);
    } finally {
      setIsSigningIn(false);
    }
  }

  /**
   * 登出
   * @param skipRemote - 为 true 时跳过后端登出调用（用于被动登出场景）
   */
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

  /**
   * 刷新会话
   * 重新从后端获取用户信息（token 不变）
   */
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

  /**
   * 刷新访问令牌（去重版本）
   * 使用 refreshToken 获取新的 accessToken，
   * 通过 ref 保证并发调用只实际执行一次
   * @returns 新的 token 或 null（刷新失败时自动登出）
   */
  async function refreshAccessToken(): Promise<string | null> {
    // 已有刷新请求在执行 → 复用同一 Promise
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

  /** 使用 useMemo 缓存上下文值，避免不必要的子组件重渲染 */
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

/**
 * 认证上下文 Hook
 * 必须在 AuthProvider 内部使用，否则抛出错误
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
