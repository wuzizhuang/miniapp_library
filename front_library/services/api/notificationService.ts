// services/api/notificationService.ts
// 消息通知模块接口服务

import apiClient from "@/lib/axios";
import { ApiNotificationDto, ApiNotificationType, PageResponse } from "@/types/api";

export interface Notification {
  notificationId: number;
  title: string;
  content: string;
  type: ApiNotificationType;
  isRead: boolean;
  createTime: string;
  relatedEntityId?: number;
  targetType?: string;
  targetId?: string;
  routeHint?: string;
  businessKey?: string;
}

function mapDto(dto: ApiNotificationDto): Notification {
  return {
    notificationId: dto.notificationId,
    title: dto.title,
    content: dto.content,
    type: dto.type,
    isRead: dto.isRead,
    createTime: dto.sendTime,
    relatedEntityId: dto.relatedEntityId,
    targetType: dto.targetType,
    targetId: dto.targetId,
    routeHint: dto.routeHint,
    businessKey: dto.businessKey,
  };
}

function buildTargetWithHighlight(
  basePath: string,
  key: string,
  value?: string,
): string {
  if (!value) {
    return basePath;
  }

  const params = new URLSearchParams({ [key]: value });

  return `${basePath}?${params.toString()}`;
}

function normalizeNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value);
  }

  return fallback;
}

export function resolveNotificationTarget(notification: Notification): string | null {
  if (notification.targetType === "RECOMMENDATION") {
    return buildTargetWithHighlight("/my/recommendations", "highlight", notification.targetId);
  }

  if (notification.targetType === "LOAN") {
    return notification.targetId ? `/my/loan-tracking/${notification.targetId}` : "/my/shelf";
  }

  if (notification.targetType === "RESERVATION") {
    return buildTargetWithHighlight("/my/reservations", "highlight", notification.targetId);
  }
  if (notification.targetType === "SERVICE_APPOINTMENT") {
    return buildTargetWithHighlight("/my/appointments", "highlight", notification.targetId);
  }
  if (notification.targetType === "SEAT_RESERVATION") {
    return buildTargetWithHighlight("/my/seats", "highlight", notification.targetId);
  }
  if (notification.targetType === "FINE") {
    return buildTargetWithHighlight("/my/fines", "highlight", notification.targetId);
  }
  if (notification.targetType === "FEEDBACK") {
    return buildTargetWithHighlight("/help-feedback", "highlight", notification.targetId);
  }

  if (notification.routeHint) {
    return notification.routeHint;
  }

  if (notification.type === "ARRIVAL_NOTICE") {
    return "/my/reservations";
  }
  if (notification.type === "NEW_BOOK_RECOMMEND") {
    return buildTargetWithHighlight("/my/recommendations", "highlight", notification.targetId);
  }
  if (notification.type === "DUE_REMINDER") {
    return notification.targetId ? `/my/loan-tracking/${notification.targetId}` : "/my/shelf";
  }

  const joinedText = `${notification.title} ${notification.content}`;

  if (joinedText.includes("罚款")) {
    return "/my/fines";
  }
  if (joinedText.includes("反馈")) {
    return "/help-feedback";
  }
  if (joinedText.includes("预约")) {
    return "/my/reservations";
  }
  if (joinedText.includes("借阅")) {
    return notification.targetId ? `/my/loan-tracking/${notification.targetId}` : "/my/shelf";
  }

  return null;
}

export function getNotificationActionLabel(notification: Notification): string {
  const targetType = notification.targetType;

  if (targetType === "RECOMMENDATION" || notification.type === "NEW_BOOK_RECOMMEND") {
    return "查看推荐";
  }
  if (targetType === "RESERVATION" || notification.type === "ARRIVAL_NOTICE") {
    return "查看预约";
  }
  if (targetType === "SERVICE_APPOINTMENT") {
    return "查看服务预约";
  }
  if (targetType === "SEAT_RESERVATION") {
    return "查看座位预约";
  }
  if (targetType === "FINE" || `${notification.title} ${notification.content}`.includes("罚款")) {
    return "查看罚款";
  }
  if (targetType === "LOAN" || notification.type === "DUE_REMINDER") {
    return "查看借阅";
  }
  if (targetType === "FEEDBACK" || `${notification.title} ${notification.content}`.includes("反馈")) {
    return "查看反馈";
  }

  return "查看相关";
}

export const notificationService = {
  /**
   * 获取当前用户通知分页
   * GET /api/notifications
   */
  getNotificationsPage: async (
    page: unknown = 0,
    size: unknown = 20,
  ): Promise<PageResponse<Notification>> => {
    const safePage = normalizeNonNegativeInt(page, 0);
    const safeSize = normalizeNonNegativeInt(size, 20);
    const { data } = await apiClient.get<PageResponse<ApiNotificationDto>>("/notifications", {
      params: { page: safePage, size: safeSize },
    });

    return {
      ...data,
      content: (data.content ?? []).map(mapDto),
    };
  },

  /**
   * 获取当前用户通知（分页）
   * GET /api/notifications
   */
  getNotifications: async (page: unknown = 0, size: unknown = 20): Promise<Notification[]> => {
    const data = await notificationService.getNotificationsPage(page, size);

    return data.content ?? [];
  },

  /**
   * 获取未读消息数量
   * GET /api/notifications/unread-count
   */
  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<number>("/notifications/unread-count");

    return typeof data === "number" ? data : 0;
  },

  /**
   * 标记单条为已读
   * PUT /api/notifications/{id}/read
   */
  markRead: async (id: number): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  /**
   * 全部标为已读
   * PUT /api/notifications/read-all
   */
  markAllRead: async (): Promise<void> => {
    await apiClient.put("/notifications/read-all");
  },

  /**
   * 删除单条通知
   * DELETE /api/notifications/{id}
   */
  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  /**
   * 清空所有已读通知
   * DELETE /api/notifications/read
   */
  deleteAllRead: async (): Promise<void> => {
    await apiClient.delete("/notifications/read");
  },
};
