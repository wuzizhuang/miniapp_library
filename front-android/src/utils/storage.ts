/**
 * @file 本地持久化存储工具
 * @description 封装 AsyncStorage，管理用户会话数据的读写：
 *   - token（访问令牌）
 *   - refreshToken（刷新令牌）
 *   - user（用户基本信息 JSON）
 *
 *   所有键名以 "front-android/" 为前缀，避免与其他存储项冲突。
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "../types/auth";

/** 存储键名常量 */
const TOKEN_KEY = "front-android/token";
const REFRESH_TOKEN_KEY = "front-android/refresh-token";
const USER_KEY = "front-android/user";

// ─── 访问令牌 ─────────────────────────────────

/** 读取存储的访问令牌 */
export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

/** 保存访问令牌 */
export async function setStoredToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

/** 清除访问令牌 */
export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── 刷新令牌 ─────────────────────────────────

/** 读取存储的刷新令牌 */
export async function getStoredRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

/** 保存刷新令牌 */
export async function setStoredRefreshToken(token: string): Promise<void> {
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** 清除刷新令牌 */
export async function clearStoredRefreshToken(): Promise<void> {
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── 用户信息 ─────────────────────────────────

/** 读取缓存的用户信息（JSON 反序列化） */
export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** 缓存用户信息（JSON 序列化） */
export async function setStoredUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** 清除缓存的用户信息 */
export async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

// ─── 批量操作 ─────────────────────────────────

/** 一次性清除所有会话相关存储（退出登录时调用） */
export async function clearSessionStorage(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}
