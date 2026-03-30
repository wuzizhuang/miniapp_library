import {
  ApiBookRequest,
  ApiBookResourceMode,
  ApiOnlineAccessType,
} from "@/types/api";

export const BOOK_RESOURCE_MODE_OPTIONS: Array<{
  key: ApiBookResourceMode;
  label: string;
  description: string;
}> = [
  {
    key: "PHYSICAL_ONLY",
    label: "仅馆藏",
    description: "仅维护实体馆藏与副本信息",
  },
  {
    key: "DIGITAL_ONLY",
    label: "仅线上",
    description: "只提供线上访问入口，无实体副本",
  },
  {
    key: "HYBRID",
    label: "馆藏+线上",
    description: "同时维护实体副本与线上访问入口",
  },
];

export const ONLINE_ACCESS_TYPE_OPTIONS: Array<{
  key: ApiOnlineAccessType;
  label: string;
}> = [
  { key: "OPEN_ACCESS", label: "公开访问" },
  { key: "CAMPUS_ONLY", label: "校园网访问" },
  { key: "LICENSED_ACCESS", label: "授权访问" },
];

export function requiresOnlineResource(
  resourceMode?: ApiBookResourceMode,
): boolean {
  return resourceMode === "DIGITAL_ONLY" || resourceMode === "HYBRID";
}

export function supportsPhysicalCopies(
  resourceMode?: ApiBookResourceMode,
): boolean {
  return resourceMode !== "DIGITAL_ONLY";
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateBookResourceFields(
  payload: ApiBookRequest,
): string | null {
  if (!requiresOnlineResource(payload.resourceMode)) {
    return null;
  }

  const normalizedUrl = payload.onlineAccessUrl?.trim() ?? "";

  if (!normalizedUrl) {
    return "当前资源模式要求填写线上访问链接";
  }

  if (!isValidUrl(normalizedUrl)) {
    return "线上访问链接必须是有效的 http/https URL";
  }

  if (!payload.onlineAccessType) {
    return "当前资源模式要求选择线上访问策略";
  }

  return null;
}

export function normalizeBookResourcePayload(
  payload: ApiBookRequest,
): ApiBookRequest {
  if (!requiresOnlineResource(payload.resourceMode)) {
    return {
      ...payload,
      resourceMode: payload.resourceMode ?? "PHYSICAL_ONLY",
      onlineAccessUrl: undefined,
      onlineAccessType: undefined,
    };
  }

  return {
    ...payload,
    resourceMode: payload.resourceMode ?? "PHYSICAL_ONLY",
    onlineAccessUrl: payload.onlineAccessUrl?.trim(),
  };
}
