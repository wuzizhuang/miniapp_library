import type { ApiNotificationDto, ApiNotificationType, PageResponse } from "../types/api";
import { request } from "./http";

export interface NotificationItem {
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

export interface NotificationTarget {
  screen:
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
  params?: Record<string, unknown>;
}

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

export function resolveNotificationTarget(notification: NotificationItem): NotificationTarget | null {
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

export const notificationService = {
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

  async getUnreadCount(): Promise<number> {
    const response = await request<number>({
      url: "/notifications/unread-count",
      auth: true,
    });

    return typeof response === "number" ? response : 0;
  },

  async markRead(notificationId: number): Promise<void> {
    await request<void>({
      url: `/notifications/${notificationId}/read`,
      method: "PUT",
      auth: true,
    });
  },

  async markAllRead(): Promise<void> {
    await request<void>({
      url: "/notifications/read-all",
      method: "PUT",
      auth: true,
    });
  },

  async deleteNotification(notificationId: number): Promise<void> {
    await request<void>({
      url: `/notifications/${notificationId}`,
      method: "DELETE",
      auth: true,
    });
  },

  async deleteAllRead(): Promise<void> {
    await request<void>({
      url: "/notifications/read",
      method: "DELETE",
      auth: true,
    });
  },
};
