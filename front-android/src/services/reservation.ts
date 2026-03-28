/**
 * @file 预约服务
 * @description 封装图书预约相关的 API 调用：
 *   - getMyReservationsPage：分页获取我的预约列表
 *   - getMyReservations：获取全部预约（不分页）
 *   - createReservation：创建预约
 *   - cancelReservation：取消预约
 *
 *   预约状态流转：PENDING → AWAITING_PICKUP → FULFILLED / CANCELLED / EXPIRED
 */

import type { ApiReservationDto, PageResponse } from "../types/api";
import { request } from "./http";

/** 预约状态枚举 */
export type ReservationStatus =
  | "PENDING"           // 排队中
  | "AWAITING_PICKUP"   // 待取书
  | "FULFILLED"         // 已取书
  | "CANCELLED"         // 已取消
  | "EXPIRED";          // 已过期

/** 前端预约视图模型 */
export interface MyReservation {
  reservationId: number;     // 预约 ID
  bookId: number;            // 图书 ID
  bookTitle: string;         // 图书标题
  bookIsbn?: string;         // ISBN
  coverUrl?: string;         // 封面 URL
  status: ReservationStatus; // 当前状态
  queuePosition?: number;    // 排队位置（PENDING 状态下有效）
  reservationDate: string;   // 预约日期（YYYY-MM-DD）
  expiryDate?: string;       // 过期日期
}

/** 分页预约结果 */
export interface ReservationPageResult {
  items: MyReservation[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

/**
 * 将后端预约 DTO 映射为前端视图模型
 * 日期字段截取前 10 位
 */
function mapReservation(dto: ApiReservationDto): MyReservation {
  return {
    reservationId: dto.reservationId,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    coverUrl: dto.coverUrl,
    status: dto.status,
    queuePosition: dto.queuePosition,
    reservationDate: String(dto.reservationDate ?? "").slice(0, 10),
    expiryDate: dto.expiryDate ? String(dto.expiryDate).slice(0, 10) : undefined,
  };
}

/** 预约服务对象 */
export const reservationService = {
  /** 分页获取我的预约列表 */
  async getMyReservationsPage(page = 0, size = 10): Promise<ReservationPageResult> {
    const response = await request<PageResponse<ApiReservationDto>>({
      url: "/reservations/me",
      query: { page, size },
      auth: true,
    });

    return {
      items: (response.content ?? []).map(mapReservation),
      totalPages: Math.max(1, response.totalPages ?? 1),
      totalElements: response.totalElements ?? 0,
      page: response.number ?? page,
      size: response.size ?? size,
    };
  },

  /** 获取全部预约（一次性加载，最多 100 条） */
  async getMyReservations(): Promise<MyReservation[]> {
    const response = await this.getMyReservationsPage(0, 100);

    return response.items;
  },

  /** 创建图书预约 */
  async createReservation(bookId: number): Promise<void> {
    await request<void, { bookId: number }>({
      url: "/reservations",
      method: "POST",
      data: { bookId },
      auth: true,
    });
  },

  /** 取消预约 */
  async cancelReservation(reservationId: number): Promise<void> {
    await request<void>({
      url: `/reservations/${reservationId}/cancel`,
      method: "PUT",
      auth: true,
    });
  },
};
