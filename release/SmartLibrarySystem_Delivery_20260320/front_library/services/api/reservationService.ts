// services/api/reservationService.ts
// 预约排队模块接口服务

import apiClient from "@/lib/axios";
import { ApiDashboardBreakdownItemDto, ApiReservationDto, PageResponse } from "@/types/api";

export type ReservationStatus =
  | "PENDING"
  | "AWAITING_PICKUP"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface MyReservation {
  reservationId: number;
  bookId: number;
  bookTitle: string;
  bookIsbn?: string;
  coverUrl?: string;
  status: ReservationStatus;
  queuePosition?: number;
  reservationDate: string;
  expiryDate?: string;
}

export interface AdminReservation extends MyReservation {
  userId: number;
  username: string;
  userFullName?: string;
}

export interface ReservationPageResult<T> {
  items: T[];
  totalPages: number;
  totalElements: number;
  page?: number;
  size?: number;
}

function mapStatus(status: ApiReservationDto["status"]): ReservationStatus {
  return status as ReservationStatus;
}

function mapDto(dto: ApiReservationDto): AdminReservation {
  return {
    reservationId: dto.reservationId,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    coverUrl: dto.coverUrl,
    status: mapStatus(dto.status),
    queuePosition: dto.queuePosition,
    reservationDate: String(dto.reservationDate ?? "").slice(0, 10),
    expiryDate: dto.expiryDate ? String(dto.expiryDate).slice(0, 10) : undefined,
    userId: dto.userId,
    username: dto.username,
    userFullName: dto.userFullName,
  };
}

export const reservationService = {
  /**
   * 当前用户的预约分页
   * GET /api/reservations/me
   */
  getMyReservationsPage: async (page = 0, size = 10): Promise<ReservationPageResult<MyReservation>> => {
    const { data } = await apiClient.get<PageResponse<ApiReservationDto>>("/reservations/me", {
      params: { page, size },
    });

    return {
      items: (data.content ?? []).map(mapDto),
      totalPages: Math.max(1, data.totalPages ?? 1),
      totalElements: data.totalElements ?? 0,
      page: data.number ?? page,
      size: data.size ?? size,
    };
  },

  /**
   * 当前用户的预约列表
   * GET /api/reservations/me
   */
  getMyReservations: async (): Promise<MyReservation[]> => {
    const data = await reservationService.getMyReservationsPage(0, 100);

    return data.items;
  },

  /**
   * 所有预约（管理员）
   * GET /api/reservations
   */
  getAllReservations: async (
    status?: string,
    keyword?: string,
    page = 0,
    size = 10,
  ): Promise<ReservationPageResult<AdminReservation>> => {
    const normalizedStatus = status && status !== "all" ? status : undefined;
    const { data } = await apiClient.get<PageResponse<ApiReservationDto>>("/reservations", {
      params: {
        page,
        size,
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
      },
    });

    return {
      items: (data.content ?? []).map(mapDto),
      totalPages: Math.max(1, data.totalPages ?? 1),
      totalElements: data.totalElements ?? 0,
      page: data.number ?? page,
      size: data.size ?? size,
    };
  },

  getReservationStats: async (keyword?: string): Promise<ApiDashboardBreakdownItemDto[]> => {
    const { data } = await apiClient.get<ApiDashboardBreakdownItemDto[]>("/reservations/stats", {
      params: keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    });

    return data ?? [];
  },

  /**
   * 发起预约
   * POST /api/reservations
   */
  createReservation: async (bookId: number): Promise<void> => {
    await apiClient.post("/reservations", { bookId });
  },

  /**
   * 取消预约
   * PUT /api/reservations/{id}/cancel
   */
  cancelReservation: async (id: number): Promise<void> => {
    await apiClient.put(`/reservations/${id}/cancel`);
  },

  /**
   * 预约履约（管理员）
   * PUT /api/reservations/{id}/fulfill
   */
  fulfillReservation: async (id: number): Promise<void> => {
    await apiClient.put(`/reservations/${id}/fulfill`);
  },
};
