/**
 * @file 座位预约服务
 * @description 封装图书馆自习座位预约相关的 API 调用：
 *   - getSeats：查询座位列表（支持按楼层、区域、时间段筛选）
 *   - createReservation：创建座位预约
 *   - getMyReservations：获取我的座位预约记录
 *   - cancelReservation：取消座位预约
 *
 *   座位类型：STANDARD（普通）/ COMPUTER（电脑）/ DISCUSSION（讨论）
 *   预约状态：ACTIVE（有效）/ CANCELLED（已取消）/ COMPLETED（已完成）/ MISSED（未到）
 */

import type {
  ApiSeatDto,
  ApiSeatReservationCreateDto,
  ApiSeatReservationDto,
} from "../types/api";
import { request } from "./http";

/** 前端座位视图模型 */
export interface SeatItem {
  seatId: number;                // 座位 ID
  seatCode: string;              // 座位编号
  floorName: string;             // 楼层名称
  floorOrder?: number;           // 楼层排序值
  zoneName?: string;             // 区域名称
  areaName?: string;             // 区域详细名称
  seatType: "STANDARD" | "COMPUTER" | "DISCUSSION";  // 座位类型
  status: "AVAILABLE" | "UNAVAILABLE";                 // 座位状态
  hasPower: boolean;             // 是否有电源插座
  nearWindow: boolean;           // 是否靠窗
  description?: string;          // 座位描述
  available: boolean;            // 在指定时间段内是否可用
}

/** 前端座位预约视图模型 */
export interface SeatReservationItem {
  reservationId: number;         // 预约 ID
  userId: number;                // 用户 ID
  username: string;              // 用户名
  userFullName?: string;         // 用户全名
  seatId: number;                // 座位 ID
  seatCode: string;              // 座位编号
  floorName?: string;            // 楼层名称
  zoneName?: string;             // 区域名称
  areaName?: string;             // 区域详细名称
  seatType?: "STANDARD" | "COMPUTER" | "DISCUSSION";  // 座位类型
  startTime: string;             // 预约开始时间
  endTime: string;               // 预约结束时间
  status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "MISSED";  // 预约状态
  notes?: string;                // 备注
  createTime: string;            // 创建时间
  updateTime?: string;           // 更新时间
}

/** 座位查询参数 */
export interface GetSeatsParams {
  floorName?: string;            // 按楼层筛选
  zoneName?: string;             // 按区域筛选
  startTime?: string;            // 可用性检查开始时间
  endTime?: string;              // 可用性检查结束时间
  availableOnly?: boolean;       // 是否只返回可用座位
}

/** 将后端座位 DTO 映射为前端视图模型 */
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

/** 将后端座位预约 DTO 映射为前端视图模型 */
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

/** 座位预约服务对象 */
export const seatReservationService = {
  /**
   * 查询座位列表
   * 支持按楼层、区域、时间段筛选
   */
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

  /** 创建座位预约 */
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

  /** 获取我的座位预约记录 */
  async getMyReservations(): Promise<SeatReservationItem[]> {
    const response = await request<ApiSeatReservationDto[]>({
      url: "/seat-reservations/me",
      auth: true,
    });

    return (response ?? []).map(mapReservation);
  },

  /** 取消座位预约 */
  async cancelReservation(reservationId: number): Promise<void> {
    await request<void>({
      url: `/seat-reservations/${reservationId}/cancel`,
      method: "PUT",
      auth: true,
    });
  },
};
