import { API_BASE_URL } from "../config/env";
import type { ApiErrorResponse } from "../types/api";
import { getStoredToken } from "../utils/storage";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<TData = unknown> {
  url: string;
  method?: HttpMethod;
  data?: TData;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  tokenOverride?: string;
  skipAuthRefresh?: boolean;
  timeoutMs?: number;
}

type UnauthorizedHandler = () => void | Promise<void>;
type TokenRefreshHandler = () => Promise<string | null>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let tokenRefreshHandler: TokenRefreshHandler | null = null;
const DEFAULT_TIMEOUT_MS = 6000;

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

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybeError = payload as Partial<ApiErrorResponse>;
  return maybeError.message || maybeError.error || fallback;
}

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

export async function request<TResponse, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<TResponse> {
  return performRequest(options);
}

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
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError("请求超时，请稍后重试", 408);
    }

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

  if (response.ok) {
    return payload as TResponse;
  }

  if (response.status === 401 && options.auth && !options.skipAuthRefresh && tokenRefreshHandler) {
    try {
      const refreshedToken = await tokenRefreshHandler();
      if (refreshedToken) {
        return performRequest<TResponse, TData>({
          ...options,
          tokenOverride: refreshedToken,
          skipAuthRefresh: true,
        });
      }
    } catch {
      // Fall through to unauthorized handling.
    }
  }

  if (response.status === 401 && unauthorizedHandler) {
    await unauthorizedHandler();
  }

  throw new HttpError(
    extractErrorMessage(payload, `Request failed with status ${response.status}`),
    response.status,
    payload,
  );
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function registerTokenRefreshHandler(handler: TokenRefreshHandler | null): void {
  tokenRefreshHandler = handler;
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isHttpError(error) && error.statusCode === 401;
}

export function getErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (isHttpError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
