import apiClient from "@/lib/axios";
import { ApiSeatDto, ApiSeatReservationCreateDto, ApiSeatReservationDto } from "@/types/api";

// ─── 前端视图类型 ────────────────────────────────────────────

export interface SeatItem {
  seatId: number;
  seatCode: string;
  floorName: string;
  floorOrder?: number;
  zoneName?: string;
  areaName?: string;
  seatType: "STANDARD" | "COMPUTER" | "DISCUSSION";
  status: "AVAILABLE" | "UNAVAILABLE";
  hasPower: boolean;
  nearWindow: boolean;
  description?: string;
  available: boolean;
}

export interface SeatReservationItem {
  reservationId: number;
  userId: number;
  username?: string;
  userFullName?: string;
  seatId: number;
  seatCode: string;
  floorName?: string;
  zoneName?: string;
  areaName?: string;
  seatType?: string;
  startTime: string;
  endTime: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  notes?: string;
  createTime?: string;
  updateTime?: string;
}

export interface GetSeatsParams {
  floorName?: string;
  zoneName?: string;
  startTime?: string;
  endTime?: string;
  availableOnly?: boolean;
}

// ─── 工具函数 ────────────────────────────────────────────────

function mapSeat(dto: ApiSeatDto): SeatItem {
  return {
    seatId: dto.seatId,
    seatCode: dto.seatCode,
    floorName: dto.floorName,
    floorOrder: dto.floorOrder,
    zoneName: dto.zoneName,
    areaName: dto.areaName,
    seatType: dto.seatType,
    status: dto.status,
    hasPower: dto.hasPower,
    nearWindow: dto.nearWindow,
    description: dto.description,
    available: Boolean(dto.available),
  };
}

function mapReservation(dto: ApiSeatReservationDto): SeatReservationItem {
  return {
    reservationId: dto.reservationId,
    userId: dto.userId,
    username: dto.username,
    userFullName: dto.userFullName,
    seatId: dto.seatId,
    seatCode: dto.seatCode,
    floorName: dto.floorName,
    zoneName: dto.zoneName,
    areaName: dto.areaName,
    seatType: dto.seatType,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: dto.status,
    notes: dto.notes,
    createTime: dto.createTime,
    updateTime: dto.updateTime,
  };
}

// ─── seatReservationService ──────────────────────────────────

export const seatReservationService = {
  /**
   * 查询可用座位
   * GET /api/seats
   */
  getSeats: async (params: GetSeatsParams = {}): Promise<SeatItem[]> => {
    const { data } = await apiClient.get<ApiSeatDto[]>("/seats", {
      params: {
        floorName: params.floorName,
        zoneName: params.zoneName,
        startTime: params.startTime,
        endTime: params.endTime,
        availableOnly: params.availableOnly,
      },
    });

    return (data ?? []).map(mapSeat);
  },

  /**
   * 创建座位预约
   * POST /api/seat-reservations
   */
  createReservation: async (payload: ApiSeatReservationCreateDto): Promise<SeatReservationItem> => {
    const { data } = await apiClient.post<ApiSeatReservationDto>("/seat-reservations", payload);

    return mapReservation(data);
  },

  /**
   * 获取当前用户的座位预约
   * GET /api/seat-reservations/me
   */
  getMyReservations: async (): Promise<SeatReservationItem[]> => {
    const { data } = await apiClient.get<ApiSeatReservationDto[]>("/seat-reservations/me");

    return (data ?? []).map(mapReservation);
  },

  /**
   * 取消当前用户的座位预约
   * PUT /api/seat-reservations/{id}/cancel
   */
  cancelReservation: async (reservationId: number): Promise<void> => {
    await apiClient.put(`/seat-reservations/${reservationId}/cancel`);
  },
};
