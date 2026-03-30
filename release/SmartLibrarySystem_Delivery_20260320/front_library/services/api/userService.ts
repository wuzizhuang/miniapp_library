import apiClient from "@/lib/axios";
import { ApiUserOverviewDto } from "@/types/api";

export interface OverviewDueSoonLoan {
  loanId: number;
  bookId: number;
  bookTitle: string;
  dueDate: string;
  daysRemaining: number;
  status: string;
}

export interface UserOverview {
  userId: number;
  username: string;
  fullName?: string;
  activeLoanCount: number;
  dueSoonLoanCount: number;
  dueSoonLoans: OverviewDueSoonLoan[];
  activeReservationCount: number;
  readyReservationCount: number;
  pendingFineCount: number;
  pendingFineTotal: number;
  unreadNotificationCount: number;
  favoriteCount: number;
  pendingServiceAppointmentCount: number;
  completedServiceAppointmentCount: number;
}

function mapOverview(dto: ApiUserOverviewDto): UserOverview {
  return {
    userId: dto.userId,
    username: dto.username,
    fullName: dto.fullName,
    activeLoanCount: dto.activeLoanCount ?? 0,
    dueSoonLoanCount: dto.dueSoonLoanCount ?? 0,
    dueSoonLoans: (dto.dueSoonLoans ?? []).map((loan) => ({
      loanId: loan.loanId,
      bookId: loan.bookId,
      bookTitle: loan.bookTitle,
      dueDate: String(loan.dueDate ?? "").slice(0, 10),
      daysRemaining: loan.daysRemaining ?? 0,
      status: loan.status,
    })),
    activeReservationCount: dto.activeReservationCount ?? 0,
    readyReservationCount: dto.readyReservationCount ?? 0,
    pendingFineCount: dto.pendingFineCount ?? 0,
    pendingFineTotal: Number(dto.pendingFineTotal ?? 0),
    unreadNotificationCount: dto.unreadNotificationCount ?? 0,
    favoriteCount: dto.favoriteCount ?? 0,
    pendingServiceAppointmentCount: dto.pendingServiceAppointmentCount ?? 0,
    completedServiceAppointmentCount: dto.completedServiceAppointmentCount ?? 0,
  };
}

export const userService = {
  /**
   * 获取当前用户总览
   * GET /api/users/me/overview
   */
  getMyOverview: async (): Promise<UserOverview> => {
    const { data } = await apiClient.get<ApiUserOverviewDto>("/users/me/overview");

    return mapOverview(data);
  },
};
