/**
 * @file 服务预约服务
 * @description 封装图书馆服务预约相关的 API 调用：
 *   - createAppointment：创建服务预约
 *   - getMyAppointments：分页获取我的服务预约
 *   - cancelAppointment：取消服务预约
 *
 *   服务类型：RETURN_BOOK（还书）/ PICKUP_BOOK（取书）/ CONSULTATION（咨询）
 *   服务方式：COUNTER（柜台）/ SMART_LOCKER（智能柜）
 *   预约状态：PENDING（待处理）/ COMPLETED（已完成）/ CANCELLED（已取消）/ MISSED（未到）
 */

import type {
  ApiServiceAppointmentCreateDto,
  ApiServiceAppointmentDto,
  PageResponse,
} from "../types/api";
import { request } from "./http";

/** 前端服务预约视图模型 */
export interface ServiceAppointment {
  appointmentId: number;         // 预约 ID
  userId: number;                // 用户 ID
  username: string;              // 用户名
  userFullName?: string;         // 用户全名
  loanId?: number;               // 关联的借阅 ID（还书/取书时有值）
  bookTitle?: string;            // 相关图书标题
  serviceType: "RETURN_BOOK" | "PICKUP_BOOK" | "CONSULTATION";  // 服务类型
  method: "COUNTER" | "SMART_LOCKER";                             // 服务方式
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "MISSED";      // 预约状态
  scheduledTime: string;         // 预约时间
  returnLocation?: string;       // 归还地点
  notes?: string;                // 备注
  createTime: string;            // 创建时间
  updateTime?: string;           // 更新时间
}

/** 将后端服务预约 DTO 映射为前端视图模型 */
function mapAppointment(dto: ApiServiceAppointmentDto): ServiceAppointment {
  return {
    appointmentId: dto.appointmentId,
    userId: dto.userId,
    username: dto.username,
    userFullName: dto.userFullName,
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    serviceType: dto.serviceType,
    method: dto.method,
    status: dto.status,
    scheduledTime: dto.scheduledTime,
    returnLocation: dto.returnLocation,
    notes: dto.notes,
    createTime: dto.createTime,
    updateTime: dto.updateTime,
  };
}

/** 服务预约服务对象 */
export const serviceAppointmentService = {
  /** 创建服务预约 */
  async createAppointment(
    payload: ApiServiceAppointmentCreateDto,
  ): Promise<ServiceAppointment> {
    const response = await request<ApiServiceAppointmentDto, ApiServiceAppointmentCreateDto>({
      url: "/service-appointments",
      method: "POST",
      data: payload,
      auth: true,
    });

    return mapAppointment(response);
  },

  /** 分页获取我的服务预约 */
  async getMyAppointments(page = 0, size = 20): Promise<PageResponse<ServiceAppointment>> {
    const response = await request<PageResponse<ApiServiceAppointmentDto>>({
      url: "/service-appointments/me",
      query: { page, size },
      auth: true,
    });

    return {
      ...response,
      content: (response.content ?? []).map(mapAppointment),
    };
  },

  /** 取消服务预约 */
  async cancelAppointment(appointmentId: number): Promise<void> {
    await request<void>({
      url: `/service-appointments/${appointmentId}/cancel`,
      method: "PUT",
      auth: true,
    });
  },
};
