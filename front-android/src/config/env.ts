/**
 * @file 环境变量配置
 * @description 从 Expo 环境变量中读取后端 API 基础 URL。
 *   - 开发环境默认使用 http://10.0.2.2:8089/api（Android 模拟器访问宿主机）
 *   - 可通过 .env 文件中的 EXPO_PUBLIC_API_BASE_URL 覆盖
 */

/** 去除 URL 末尾的斜杠，避免拼接时出现双斜杠 */
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** 后端 API 基础 URL（全局唯一入口） */
export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://154.19.43.33:8089/api",
);
