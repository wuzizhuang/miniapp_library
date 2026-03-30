import type {
  ApiServiceAppointmentCreateDto,
  ApiServiceAppointmentDto,
  PageResponse,
} from "../types/api";
import { request } from "./http";

export interface ServiceAppointment {
  appointmentId: number;
  userId: number;
  username: string;
  userFullName?: string;
  loanId?: number;
  bookTitle?: string;
  serviceType: "RETURN_BOOK" | "PICKUP_BOOK" | "CONSULTATION";
  method: "COUNTER" | "SMART_LOCKER";
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "MISSED";
  scheduledTime: string;
  returnLocation?: string;
  notes?: string;
  createTime: string;
  updateTime?: string;
}

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

export const serviceAppointmentService = {
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

  async cancelAppointment(appointmentId: number): Promise<void> {
    await request<void>({
      url: `/service-appointments/${appointmentId}/cancel`,
      method: "PUT",
      auth: true,
    });
  },
};
