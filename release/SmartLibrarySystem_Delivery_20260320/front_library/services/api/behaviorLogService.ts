import apiClient from "@/lib/axios";
import { ApiBehaviorLogRequestDto } from "@/types/api";

function resolveDeviceType(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const ua = navigator.userAgent.toLowerCase();

  if (/mobile|android|iphone|ipad/.test(ua)) {
    return "MOBILE";
  }

  return "DESKTOP";
}

export const behaviorLogService = {
  logBookAction: async (payload: ApiBehaviorLogRequestDto): Promise<void> => {
    await apiClient.post("/behavior-logs", {
      ...payload,
      deviceType: payload.deviceType ?? resolveDeviceType(),
    });
  },
};
