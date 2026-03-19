import type {
  ApiSeatDto,
  ApiSeatReservationCreateDto,
  ApiSeatReservationDto,
} from "../types/api";
import { request } from "./http";

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
  username: string;
  userFullName?: string;
  seatId: number;
  seatCode: string;
  floorName?: string;
  zoneName?: string;
  areaName?: string;
  seatType?: "STANDARD" | "COMPUTER" | "DISCUSSION";
  startTime: string;
  endTime: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "MISSED";
  notes?: string;
  createTime: string;
  updateTime?: string;
}

export interface GetSeatsParams {
  floorName?: string;
  zoneName?: string;
  startTime?: string;
  endTime?: string;
  availableOnly?: boolean;
}

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

export const seatReservationService = {
  async getSeats(params: GetSeatsParams = {}): Promise<SeatItem[]> {
    const response = await request<ApiSeatDto[]>({
      url: "/seats",
      query: {
        floorName: params.floorName,
        zoneName: params.zoneName,
        startTime: params.startTime,
        endTime: params.endTime,
        availableOnly: params.availableOnly,
      },
      auth: true,
    });

    return (response ?? []).map(mapSeat);
  },

  async createReservation(
    payload: ApiSeatReservationCreateDto,
  ): Promise<SeatReservationItem> {
    const response = await request<ApiSeatReservationDto, ApiSeatReservationCreateDto>({
      url: "/seat-reservations",
      method: "POST",
      data: payload,
      auth: true,
    });

    return mapReservation(response);
  },

  async getMyReservations(): Promise<SeatReservationItem[]> {
    const response = await request<ApiSeatReservationDto[]>({
      url: "/seat-reservations/me",
      auth: true,
    });

    return (response ?? []).map(mapReservation);
  },

  async cancelReservation(reservationId: number): Promise<void> {
    await request<void>({
      url: `/seat-reservations/${reservationId}/cancel`,
      method: "PUT",
      auth: true,
    });
  },
};
