/**
 * @file 用户相关类型定义
 * @description 定义用户领域的前端数据模型：
 *   - UserOverviewLoan：即将到期借阅概要
 *   - UserOverview：用户概览统计数据
 */

/** 即将到期的借阅概要（用于概览面板展示） */
export interface UserOverviewLoan {
  loanId: number;              // 借阅 ID
  bookId: number;              // 图书 ID
  bookTitle: string;           // 图书标题
  dueDate: string;             // 应还日期
  daysRemaining: number;       // 剩余天数
  status: string;              // 借阅状态
}

/** 用户概览统计数据（"我的"页面展示） */
export interface UserOverview {
  userId: number;                         // 用户 ID
  username: string;                       // 用户名
  fullName?: string;                      // 全名
  activeLoanCount: number;                // 当前在借数量
  dueSoonLoanCount: number;               // 即将到期借阅数量
  dueSoonLoans: UserOverviewLoan[];       // 即将到期借阅详情列表
  activeReservationCount: number;         // 有效预约数量
  readyReservationCount: number;          // 可取书预约数量
  pendingFineCount: number;               // 待付罚款笔数
  pendingFineTotal: number;               // 待付罚款总金额
  unreadNotificationCount: number;        // 未读通知数量
  favoriteCount: number;                  // 收藏数量
  pendingServiceAppointmentCount: number; // 待处理服务预约数量
  completedServiceAppointmentCount: number; // 已完成服务预约数量
}
