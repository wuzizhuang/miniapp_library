/**
 * @file 用户服务
 * @description 封装用户相关的 API 调用：
 *   - getMyProfile：获取当前用户资料
 *   - getMyOverview：获取用户概览统计数据
 *
 *   概览数据包含用户的各项统计计数：
 *   - 在借数量、即将到期借阅
 *   - 预约数量（含可取书数量）
 *   - 待付罚款统计
 *   - 未读通知数量
 *   - 收藏数量
 *   - 服务预约统计
 */

import type { ApiUserOverviewDto, ApiUserProfileDto } from "../types/api";
import type { UserOverview } from "../types/user";
import { safeNumber } from "../utils/format";
import { request } from "./http";

/**
 * 将后端概览 DTO 映射为前端视图模型
 * 使用 safeNumber 确保所有数值字段的安全性（null / undefined → 0）
 */
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

/** 用户服务对象 */
export const userService = {
  /** 获取当前用户资料 */
  async getMyProfile(): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto>({
      url: "/users/me/profile",
      auth: true,
    });
  },

  /** 获取用户概览统计数据（用于"我的"页面概览展示） */
  async getMyOverview(): Promise<UserOverview> {
    const response = await request<ApiUserOverviewDto>({
      url: "/users/me/overview",
      auth: true,
    });

    return mapOverview(response);
  },
};
