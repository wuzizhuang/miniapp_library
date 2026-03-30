// lib/axios.ts
import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

const AUTH_401_BYPASS_PATHS = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/reset-password/validate",
];

// 创建 axios 实例
const apiClient = axios.create({
  // 这里的 /api/backend 会被 next.config.js 代理转发到后端 8089
  baseURL: "/api/backend",
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：自动添加 Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 Token
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      // 确保 headers 存在
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

// 响应拦截器：处理全局错误（如 401 未登录）
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    // 获取请求的 URL，判断是不是登录接口
    const requestUrl = error.config?.url || "";
    const shouldBypassUnauthorizedRedirect = AUTH_401_BYPASS_PATHS.some((path) =>
      requestUrl.includes(path),
    );

    // 检查是否是 401 错误
    if (error.response && error.response.status === 401) {
      if (shouldBypassUnauthorizedRedirect) {
        return Promise.reject(error);
      }

      // 对于其他接口（比如获取书架列表）报的 401，才说明是 Token 过期，需要跳转
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
