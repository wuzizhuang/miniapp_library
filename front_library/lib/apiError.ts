import { ApiErrorResponse } from "@/types/api";

export interface ApiErrorInfo {
  message: string;
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  validationErrors?: Record<string, string>;
}

export function getApiErrorInfo(error: unknown, fallbackMessage: string): ApiErrorInfo {
  const responseStatus = (error as any)?.response?.status as number | undefined;
  const responseData = (error as any)?.response?.data as ApiErrorResponse | undefined;
  const retryAfterSeconds =
    typeof responseData?.retryAfterSeconds === "number"
      ? responseData.retryAfterSeconds
      : undefined;
  const validationErrors =
    responseData?.validationErrors && Object.keys(responseData.validationErrors).length > 0
      ? responseData.validationErrors
      : undefined;
  const baseMessage = responseData?.message || (error as any)?.message || fallbackMessage;

  if (responseStatus === 429 && retryAfterSeconds) {
    return {
      message: `${baseMessage} 请在 ${retryAfterSeconds} 秒后再试。`,
      status: responseStatus,
      code: responseData?.code,
      retryAfterSeconds,
      validationErrors,
    };
  }

  if (responseStatus === 403) {
    return {
      message: responseData?.message || "当前账号无权执行该操作。",
      status: responseStatus,
      code: responseData?.code,
      retryAfterSeconds,
      validationErrors,
    };
  }

  return {
    message: baseMessage,
    status: responseStatus,
    code: responseData?.code,
    retryAfterSeconds,
    validationErrors,
  };
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  return getApiErrorInfo(error, fallbackMessage).message;
}
