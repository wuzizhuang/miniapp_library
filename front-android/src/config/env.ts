function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8089/api",
);
