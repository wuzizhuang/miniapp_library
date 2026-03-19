import type { ApiUserOverviewDto, ApiUserProfileDto } from "../types/api";
import type { UserOverview } from "../types/user";
import { safeNumber } from "../utils/format";
import { request } from "./http";

function mapOverview(dto: ApiUserOverviewDto): UserOverview {
  return {
    userId: dto.userId,
    username: dto.username,
    fullName: dto.fullName,
    activeLoanCount: safeNumber(dto.activeLoanCount),
    dueSoonLoanCount: safeNumber(dto.dueSoonLoanCount),
    dueSoonLoans: (dto.dueSoonLoans ?? []).map((loan) => ({
      loanId: loan.loanId,
      bookId: loan.bookId,
      bookTitle: loan.bookTitle,
      dueDate: loan.dueDate,
      daysRemaining: safeNumber(loan.daysRemaining),
      status: loan.status,
    })),
    activeReservationCount: safeNumber(dto.activeReservationCount),
    readyReservationCount: safeNumber(dto.readyReservationCount),
    pendingFineCount: safeNumber(dto.pendingFineCount),
    pendingFineTotal: safeNumber(dto.pendingFineTotal),
    unreadNotificationCount: safeNumber(dto.unreadNotificationCount),
    favoriteCount: safeNumber(dto.favoriteCount),
    pendingServiceAppointmentCount: safeNumber(dto.pendingServiceAppointmentCount),
    completedServiceAppointmentCount: safeNumber(dto.completedServiceAppointmentCount),
  };
}

export const userService = {
  async getMyProfile(): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto>({
      url: "/users/me/profile",
      auth: true,
    });
  },

  async getMyOverview(): Promise<UserOverview> {
    const response = await request<ApiUserOverviewDto>({
      url: "/users/me/overview",
      auth: true,
    });

    return mapOverview(response);
  },
};

