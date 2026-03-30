import type { ApiReservationDto, PageResponse } from "../types/api";
import { request } from "./http";

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

export interface ReservationPageResult {
  items: MyReservation[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

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

export const reservationService = {
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

  async getMyReservations(): Promise<MyReservation[]> {
    const response = await this.getMyReservationsPage(0, 100);

    return response.items;
  },

  async createReservation(bookId: number): Promise<void> {
    await request<void, { bookId: number }>({
      url: "/reservations",
      method: "POST",
      data: { bookId },
      auth: true,
    });
  },

  async cancelReservation(reservationId: number): Promise<void> {
    await request<void>({
      url: `/reservations/${reservationId}/cancel`,
      method: "PUT",
      auth: true,
    });
  },
};
