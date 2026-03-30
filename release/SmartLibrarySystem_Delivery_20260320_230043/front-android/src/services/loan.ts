/**
 * @file 借阅服务
 * @description 封装借阅相关的 API 调用：
 *   - getMyLoans：获取当前借阅列表
 *   - getMyLoanHistory：获取历史借阅记录
 *   - getLoanById：获取单条借阅详情
 *   - createLoan：创建借阅
 *   - renewLoan：续借
 *   - returnLoan：归还
 *
 *   数据映射：
 *   - 后端 ACTIVE 状态映射为前端 BORROWED 状态
 *   - 续借次数 < 2 且状态为 ACTIVE 时允许续借
 */

import type { ApiLoanDto, PageResponse } from "../types/api";
import { request } from "./http";

/** 前端借阅视图模型 */
export interface MyLoan {
  loanId: number;              // 借阅 ID
  bookTitle: string;           // 图书标题
  bookIsbn?: string;           // ISBN
  bookCover?: string;          // 封面 URL
  bookAuthorNames?: string;    // 作者名称
  categoryName?: string;       // 分类名称
  locationCode?: string;       // 馆藏位置编码
  borrowDate: string;          // 借阅日期（YYYY-MM-DD）
  dueDate: string;             // 应还日期
  returnDate?: string;         // 实际归还日期
  status: "BORROWED" | "OVERDUE" | "RETURNED" | "LOST";  // 借阅状态
  daysOverdue?: number;        // 逾期天数
  daysRemaining?: number;      // 剩余天数
  renewalCount: number;        // 已续借次数
  canRenew: boolean;           // 是否可续借
  copyId: number;              // 副本 ID
  bookId?: number;             // 图书 ID
}

/**
 * 借阅状态映射
 * 后端 ACTIVE → 前端 BORROWED，其他状态直接透传
 */
function mapLoanStatus(status: ApiLoanDto["status"]): MyLoan["status"] {
  if (status === "ACTIVE") {
    return "BORROWED";
  }

  return status as MyLoan["status"];
}

/**
 * 将后端借阅 DTO 映射为前端视图模型
 * - 日期截取前 10 位（YYYY-MM-DD）
 * - 计算是否可续借（续借次数 < 2 且状态为 ACTIVE）
 */
function mapLoan(dto: ApiLoanDto): MyLoan {
  const canRenew = (dto.renewalCount ?? 0) < 2 && dto.status === "ACTIVE";

  return {
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    bookCover: dto.bookCoverUrl,
    bookAuthorNames: dto.bookAuthorNames,
    categoryName: dto.categoryName,
    locationCode: dto.locationCode,
    borrowDate: String(dto.borrowDate ?? "").slice(0, 10),
    dueDate: String(dto.dueDate ?? "").slice(0, 10),
    returnDate: dto.returnDate ? String(dto.returnDate).slice(0, 10) : undefined,
    status: mapLoanStatus(dto.status),
    daysOverdue: dto.daysOverdue,
    daysRemaining: dto.daysRemaining,
    renewalCount: dto.renewalCount ?? 0,
    canRenew,
    copyId: dto.copyId,
    bookId: dto.bookId,
  };
}

/** 借阅服务对象 */
export const loanService = {
  /** 获取当前借阅列表（最多 50 条） */
  async getMyLoans(): Promise<MyLoan[]> {
    const response = await request<PageResponse<ApiLoanDto>>({
      url: "/loans/my",
      query: { page: 0, size: 50 },
      auth: true,
    });

    return (response.content ?? []).map(mapLoan);
  },

  /** 获取历史借阅记录（最多 100 条） */
  async getMyLoanHistory(): Promise<MyLoan[]> {
    const response = await request<PageResponse<ApiLoanDto>>({
      url: "/loans/history",
      query: { page: 0, size: 100 },
      auth: true,
    });

    return (response.content ?? []).map(mapLoan);
  },

  /** 获取单条借阅详情 */
  async getLoanById(loanId: number): Promise<MyLoan> {
    const response = await request<ApiLoanDto>({
      url: `/loans/${loanId}`,
      auth: true,
    });

    return mapLoan(response);
  },

  /** 创建新借阅（通过副本 ID） */
  async createLoan(copyId: number): Promise<void> {
    await request<void, { copyId: number }>({
      url: "/loans",
      method: "POST",
      data: { copyId },
      auth: true,
    });
  },

  /** 续借（每本书最多续借 2 次） */
  async renewLoan(loanId: number): Promise<void> {
    await request<void>({
      url: `/loans/${loanId}/renew`,
      method: "PUT",
      auth: true,
    });
  },

  /** 归还图书 */
  async returnLoan(loanId: number): Promise<void> {
    await request<void>({
      url: `/loans/${loanId}/return`,
      method: "PUT",
      auth: true,
    });
  },
};
