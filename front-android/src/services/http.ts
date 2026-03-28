/**
 * @file HTTP 请求基础设施
 * @description 封装 fetch API，提供统一的网络请求能力：
 *
 *   核心功能：
 *   1. URL 构建（baseURL + path + query 参数拼接）
 *   2. 自动附加 Bearer Token 鉴权头
 *   3. 请求超时控制（默认 6 秒，通过 AbortController 实现）
 *   4. 响应体自动解析（JSON / 纯文本）
 *   5. 统一错误处理（HttpError 类）
 *   6. 401 自动令牌刷新 + 请求重试
 *   7. 全局未授权处理器注册
 *
 *   架构设计：
 *   - request() 是公开入口
 *   - performRequest() 是内部实现，处理鉴权和重试逻辑
 *   - 通过 registerXxxHandler() 注入全局处理器（由 AuthProvider 注册）
 */

import { API_BASE_URL } from "../config/env";
import type { ApiErrorResponse } from "../types/api";
import { getStoredToken } from "../utils/storage";

/** HTTP 方法类型 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * 请求配置接口
 * @template TData - 请求体数据类型
 */
export interface RequestOptions<TData = unknown> {
  url: string;                    // 请求路径（相对于 API_BASE_URL）
  method?: HttpMethod;            // HTTP 方法（默认 GET）
  data?: TData;                   // 请求体数据（自动 JSON 序列化）
  query?: Record<string, string | number | boolean | undefined>;  // URL 查询参数
  auth?: boolean;                 // 是否需要鉴权（自动附加 Authorization 头）
  tokenOverride?: string;         // 覆盖默认 token（令牌刷新重试时使用）
  skipAuthRefresh?: boolean;      // 跳过自动刷新（防止递归重试）
  timeoutMs?: number;             // 自定义超时时间（毫秒）
}

/** 未授权处理器类型（401 触发后调用） */
type UnauthorizedHandler = () => void | Promise<void>;
/** 令牌刷新处理器类型（返回新 token 或 null） */
type TokenRefreshHandler = () => Promise<string | null>;

/** 全局处理器引用（由 AuthProvider 注入） */
let unauthorizedHandler: UnauthorizedHandler | null = null;
let tokenRefreshHandler: TokenRefreshHandler | null = null;

/** 默认请求超时时间（10 秒，兼顾弱网环境） */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * HTTP 错误类
 * 封装 HTTP 状态码和响应体，用于统一错误处理
 */
export class HttpError extends Error {
  statusCode: number;
  payload?: unknown;

  constructor(message: string, statusCode: number, payload?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

/**
 * 为 URL 附加查询参数
 * 自动过滤 undefined 和空字符串值
 */
function withQuery(
  url: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  if (!query) {
    return url;
  }

  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return queryString ? `${url}?${queryString}` : url;
}

/**
 * 从响应体中提取错误信息
 * 优先使用 message 字段，其次 error 字段，最后使用 fallback
 */
function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybeError = payload as Partial<ApiErrorResponse>;
  return maybeError.message || maybeError.error || fallback;
}

/** 安全解析响应体（兼容 JSON 和纯文本） */
function parseResponseBody(text: string): unknown {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * 公共请求入口
 * @template TResponse - 响应数据类型
 * @template TData - 请求体数据类型
 */
export async function request<TResponse, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<TResponse> {
  return performRequest(options);
}

/**
 * 内部请求实现
 *
 * 执行流程：
 *   1. 解析 token（优先使用 tokenOverride，其次从存储读取）
 *   2. 创建 AbortController 用于超时控制
 *   3. 发起 fetch 请求
 *   4. 解析响应体
 *   5. 成功 → 返回数据
 *   6. 401 + 允许刷新 → 尝试刷新令牌并重试
 *   7. 401 + 无法刷新 → 调用全局未授权处理器
 *   8. 其他错误 → 抛出 HttpError
 */
async function performRequest<TResponse, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<TResponse> {
  const token = options.tokenOverride ?? (options.auth ? await getStoredToken() : null);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(withQuery(`${API_BASE_URL}${options.url}`, options.query), {
      method: options.method || "GET",
      headers: {
        ...(options.data ? { "Content-Type": "application/json" } : {}),
        ...(options.auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.data ? JSON.stringify(options.data) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    // 超时错误
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError("请求超时，请稍后重试", 408);
    }

    // 网络错误
    throw new HttpError(
      error instanceof Error && error.message ? error.message : "Network request failed",
      0,
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  const payload = parseResponseBody(text);

  // 请求成功
  if (response.ok) {
    return payload as TResponse;
  }

  // 401 + 允许自动刷新 → 尝试刷新令牌并用新 token 重试
  if (response.status === 401 && options.auth && !options.skipAuthRefresh && tokenRefreshHandler) {
    try {
      const refreshedToken = await tokenRefreshHandler();
      if (refreshedToken) {
        return performRequest<TResponse, TData>({
          ...options,
          tokenOverride: refreshedToken,
          skipAuthRefresh: true,  // 重试时跳过刷新，防止无限递归
        });
      }
    } catch {
      // 刷新失败 → 继续走未授权流程
    }
  }

  // 401 最终处理：调用全局未授权处理器（通常是静默登出）
  if (response.status === 401 && unauthorizedHandler) {
    await unauthorizedHandler();
  }

  // 抛出包含业务错误信息的 HttpError
  throw new HttpError(
    extractErrorMessage(payload, `Request failed with status ${response.status}`),
    response.status,
    payload,
  );
}

// ─── 全局处理器注册 ─────────────────────────────────

/** 注册全局未授权（401）处理器 */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/** 注册全局令牌刷新处理器 */
export function registerTokenRefreshHandler(handler: TokenRefreshHandler | null): void {
  tokenRefreshHandler = handler;
}

// ─── 错误判断工具 ─────────────────────────────────

/** 判断错误是否为 HttpError 实例 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

/** 判断是否为 401 未授权错误 */
export function isUnauthorizedError(error: unknown): boolean {
  return isHttpError(error) && error.statusCode === 401;
}

/**
 * 从错误对象中提取友好的错误信息
 * @param error - 错误对象
 * @param fallback - 默认提示文案
 */
export function getErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (isHttpError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
