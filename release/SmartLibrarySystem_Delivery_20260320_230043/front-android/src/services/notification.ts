/**
 * @file 通知服务
 * @description 封装通知相关的 API 调用和通知路由解析：
 *
 *   API 方法：
 *   - getNotificationsPage：分页获取通知列表
 *   - getUnreadCount：获取未读通知数量
 *   - markRead：标记单条通知为已读
 *   - markAllRead：标记全部通知为已读
 *   - deleteNotification：删除单条通知
 *   - deleteAllRead：删除所有已读通知
 *
 *   路由解析（resolveNotificationTarget）：
 *   根据通知的 targetType / routeHint / type / 内容关键词
 *   推断用户点击通知后应跳转到的目标屏幕及参数。
 *   解析优先级：targetType > routeHint > type > 内容关键词推断
 */

import type { ApiNotificationDto, ApiNotificationType, PageResponse } from "../types/api";
import { request } from "./http";

/** 前端通知视图模型 */
export interface NotificationItem {
  notificationId: number;       // 通知 ID
  title: string;                // 标题
  content: string;              // 内容
  type: ApiNotificationType;    // 通知类型枚举
  isRead: boolean;              // 是否已读
  createTime: string;           // 创建时间
  relatedEntityId?: number;     // 关联实体 ID（旧版兼容）
  targetType?: string;          // 目标类型（BOOK / LOAN / RESERVATION 等）
  targetId?: string;            // 目标 ID
  routeHint?: string;           // 路由提示（Web 前端路径）
  businessKey?: string;         // 业务键
}

/** 通知跳转目标 */
export interface NotificationTarget {
  screen:                        // 目标屏幕名称
    | "MainTabs"
    | "BookDetail"
    | "LoanTracking"
    | "Reservations"
    | "Appointments"
    | "SeatReservations"
    | "Fines"
    | "HelpFeedback"
    | "Recommendations"
    | "Shelf";
  params?: Record<string, unknown>;  // 路由参数
}

/** 将后端通知 DTO 映射为前端视图模型 */
function mapNotification(dto: ApiNotificationDto): NotificationItem {
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

/**
 * 解析通知的跳转目标
 *
 * 解析优先级（从高到低）：
 * 1. targetType 精确匹配（BOOK / RECOMMENDATION / LOAN 等）
 * 2. routeHint 路径匹配（Web 前端路由映射到 App 屏幕）
 * 3. type 类型推断（NEW_BOOK_RECOMMEND / ARRIVAL_NOTICE / DUE_REMINDER）
 * 4. 内容关键词推断（罚款 / 反馈 / 预约 / 借阅）
 *
 * @param notification - 通知项
 * @returns 跳转目标（屏幕 + 参数），无法解析时返回 null
 */
export function resolveNotificationTarget(notification: NotificationItem): NotificationTarget | null {
  // ── 1. 按 targetType 精确路由 ──
  if (notification.targetType === "BOOK") {
    if (notification.targetId) {
      return {
        screen: "BookDetail",
        params: { bookId: Number(notification.targetId) },
      };
    }

    return {
      screen: "MainTabs",
      params: { screen: "BooksTab" },
    };
  }

  if (notification.targetType === "RECOMMENDATION") {
    return {
      screen: "Recommendations",
      params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
    };
  }

  if (notification.targetType === "LOAN") {
    return notification.targetId
      ? { screen: "LoanTracking", params: { loanId: Number(notification.targetId) } }
      : { screen: "Shelf" };
  }

  if (notification.targetType === "RESERVATION") {
    return {
      screen: "Reservations",
      params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
    };
  }

  if (notification.targetType === "SERVICE_APPOINTMENT") {
    return {
      screen: "Appointments",
      params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
    };
  }

  if (notification.targetType === "SEAT_RESERVATION") {
    return {
      screen: "SeatReservations",
      params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
    };
  }

  if (notification.targetType === "FINE") {
    return {
      screen: "Fines",
      params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
    };
  }

  if (notification.targetType === "FEEDBACK") {
    return {
      screen: "HelpFeedback",
      params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
    };
  }

  // ── 2. 按 routeHint 路径路由 ──
  if (notification.routeHint) {
    switch (notification.routeHint) {
      case "/books":
        return notification.targetId
          ? { screen: "BookDetail", params: { bookId: Number(notification.targetId) } }
          : { screen: "MainTabs", params: { screen: "BooksTab" } };
      case "/my/loan-tracking":
        return notification.targetId
          ? { screen: "LoanTracking", params: { loanId: Number(notification.targetId) } }
          : { screen: "Shelf" };
      case "/my/reservations":
        return {
          screen: "Reservations",
          params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
        };
      case "/my/appointments":
        return {
          screen: "Appointments",
          params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
        };
      case "/my/seats":
      case "/my/seat-reservations":
        return {
          screen: "SeatReservations",
          params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
        };
      case "/my/fines":
        return {
          screen: "Fines",
          params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
        };
      case "/my/recommendations":
        return {
          screen: "Recommendations",
          params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
        };
      case "/help-feedback":
        return {
          screen: "HelpFeedback",
          params: notification.targetId ? { highlightId: Number(notification.targetId) } : undefined,
        };
      default:
        break;
    }
  }

  // ── 3. 按通知类型推断 ──
  if (notification.type === "NEW_BOOK_RECOMMEND") {
    return {
      screen: notification.targetId ? "BookDetail" : "MainTabs",
      params: notification.targetId
        ? { bookId: Number(notification.targetId) }
        : { screen: "BooksTab" },
    };
  }

  if (notification.type === "ARRIVAL_NOTICE") {
    return { screen: "Reservations" };
  }

  if (notification.type === "DUE_REMINDER") {
    return notification.targetId
      ? { screen: "LoanTracking", params: { loanId: Number(notification.targetId) } }
      : { screen: "Shelf" };
  }

  // ── 4. 内容关键词兜底推断 ──
  const joinedText = `${notification.title} ${notification.content}`;

  if (joinedText.includes("罚款")) {
    return { screen: "Fines" };
  }
  if (joinedText.includes("反馈")) {
    return { screen: "HelpFeedback" };
  }
  if (joinedText.includes("预约")) {
    return { screen: "Reservations" };
  }
  if (joinedText.includes("借阅")) {
    return notification.targetId
      ? { screen: "LoanTracking", params: { loanId: Number(notification.targetId) } }
      : { screen: "Shelf" };
  }

  return null;
}

/** 通知服务对象 */
export const notificationService = {
  /** 分页获取通知列表 */
  async getNotificationsPage(page = 0, size = 20): Promise<PageResponse<NotificationItem>> {
    const response = await request<PageResponse<ApiNotificationDto>>({
      url: "/notifications",
      query: { page, size },
      auth: true,
    });

    return {
      ...response,
      content: (response.content ?? []).map(mapNotification),
    };
  },

  /** 获取未读通知数量 */
  async getUnreadCount(): Promise<number> {
    const response = await request<number>({
      url: "/notifications/unread-count",
      auth: true,
    });

    return typeof response === "number" ? response : 0;
  },

  /** 标记单条通知为已读 */
  async markRead(notificationId: number): Promise<void> {
    await request<void>({
      url: `/notifications/${notificationId}/read`,
      method: "PUT",
      auth: true,
    });
  },

  /** 标记全部通知为已读 */
  async markAllRead(): Promise<void> {
    await request<void>({
      url: "/notifications/read-all",
      method: "PUT",
      auth: true,
    });
  },

  /** 删除单条通知 */
  async deleteNotification(notificationId: number): Promise<void> {
    await request<void>({
      url: `/notifications/${notificationId}`,
      method: "DELETE",
      auth: true,
    });
  },

  /** 删除所有已读通知 */
  async deleteAllRead(): Promise<void> {
    await request<void>({
      url: "/notifications/read",
      method: "DELETE",
      auth: true,
    });
  },
};
