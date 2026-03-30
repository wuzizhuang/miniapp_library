import apiClient from "@/lib/axios";
import {
  ApiDashboardBreakdownItemDto,
  ApiServiceAppointmentCreateDto,
  ApiServiceAppointmentDto,
  ApiServiceAppointmentMethod,
  ApiServiceAppointmentStatusUpdateDto,
  ApiServiceAppointmentStatus,
  ApiServiceAppointmentType,
  PageResponse,
} from "@/types/api";

export interface ServiceAppointment {
  appointmentId: number;
  userId: number;
  username: string;
  userFullName?: string;
  loanId?: number;
  bookTitle?: string;
  serviceType: ApiServiceAppointmentType;
  method: ApiServiceAppointmentMethod;
  status: ApiServiceAppointmentStatus;
  scheduledTime: string;
  returnLocation?: string;
  notes?: string;
  createTime: string;
  updateTime?: string;
}

export interface ServiceAppointmentPageResult<T> {
  items: T[];
  totalPages: number;
  totalElements: number;
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
  createAppointment: async (payload: ApiServiceAppointmentCreateDto): Promise<ServiceAppointment> => {
    const { data } = await apiClient.post<ApiServiceAppointmentDto>("/service-appointments", payload);

    return mapAppointment(data);
  },

  getMyAppointments: async (page = 0, size = 50): Promise<PageResponse<ServiceAppointment>> => {
    const { data } = await apiClient.get<PageResponse<ApiServiceAppointmentDto>>("/service-appointments/me", {
      params: { page, size },
    });

    return {
      ...data,
      content: (data.content ?? []).map(mapAppointment),
    };
  },

  getAllAppointments: async (
    status?: ApiServiceAppointmentStatus | "all",
    keyword?: string,
    page = 0,
    size = 10,
  ): Promise<ServiceAppointmentPageResult<ServiceAppointment>> => {
    const normalizedStatus = status && status !== "all" ? status : undefined;
    const { data } = await apiClient.get<PageResponse<ApiServiceAppointmentDto>>("/service-appointments", {
      params: {
        page,
        size,
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
      },
    });

    return {
      items: (data.content ?? []).map(mapAppointment),
      totalPages: data.totalPages ?? 0,
      totalElements: data.totalElements ?? 0,
    };
  },

  getAppointmentStats: async (keyword?: string): Promise<ApiDashboardBreakdownItemDto[]> => {
    const { data } = await apiClient.get<ApiDashboardBreakdownItemDto[]>("/service-appointments/stats", {
      params: keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    });

    return data ?? [];
  },

  cancelAppointment: async (appointmentId: number): Promise<void> => {
    await apiClient.put(`/service-appointments/${appointmentId}/cancel`);
  },

  updateAppointmentStatus: async (
    appointmentId: number,
    payload: ApiServiceAppointmentStatusUpdateDto,
  ): Promise<ServiceAppointment> => {
    const { data } = await apiClient.put<ApiServiceAppointmentDto>(`/service-appointments/${appointmentId}/status`, payload);

    return mapAppointment(data);
  },
};
