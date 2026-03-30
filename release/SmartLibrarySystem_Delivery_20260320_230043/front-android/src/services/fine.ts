/**
 * @file 罚款服务
 * @description 封装罚款相关的 API 调用：
 *   - getMyFinesPage：分页获取我的罚款列表
 *   - getMyFines：获取全部罚款（不分页）
 *   - payFine：支付罚款
 *
 *   罚款类型：OVERDUE（逾期）/ LOST（遗失）/ DAMAGE（损坏）
 *   罚款状态：PENDING（待支付）/ PAID（已支付）/ WAIVED（已减免）
 */

import type { ApiFineDto, PageResponse } from "../types/api";
import { request } from "./http";

/** 罚款状态 */
export type FineStatus = "PENDING" | "PAID" | "WAIVED";

/** 罚款类型 */
export type FineType = "OVERDUE" | "LOST" | "DAMAGE";

/** 前端罚款视图模型 */
export interface MyFine {
  fineId: number;          // 罚款 ID
  loanId?: number;         // 关联的借阅 ID
  bookTitle?: string;      // 相关图书标题
  amount: number;          // 罚款金额
  status: FineStatus;      // 罚款状态
  type: FineType;          // 罚款类型
  reason?: string;         // 罚款原因
  createTime: string;      // 创建时间（YYYY-MM-DD）
  paidTime?: string;       // 支付时间
}

/** 分页罚款结果 */
export interface MyFinesPage {
  items: MyFine[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

/**
 * 将后端罚款 DTO 映射为前端视图模型
 * 日期字段截取前 10 位
 */
function mapFine(dto: ApiFineDto): MyFine {
  return {
    fineId: dto.fineId,
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    amount: dto.amount,
    status: dto.status,
    type: dto.type,
    reason: dto.reason,
    createTime: String(dto.dateIssued ?? "").slice(0, 10),
    paidTime: dto.datePaid ? String(dto.datePaid).slice(0, 10) : undefined,
  };
}

/** 罚款服务对象 */
export const fineService = {
  /** 分页获取我的罚款列表 */
  async getMyFinesPage(page = 0, size = 10): Promise<MyFinesPage> {
    const response = await request<PageResponse<ApiFineDto>>({
      url: "/fines/me",
      query: { page, size },
      auth: true,
    });

    return {
      items: (response.content ?? []).map(mapFine),
      totalPages: Math.max(1, response.totalPages ?? 1),
      totalElements: response.totalElements ?? 0,
      page: response.number ?? page,
      size: response.size ?? size,
    };
  },

  /** 获取全部罚款（一次加载，最多 100 条） */
  async getMyFines(): Promise<MyFine[]> {
    const response = await this.getMyFinesPage(0, 100);

    return response.items;
  },

  /** 支付指定罚款 */
  async payFine(fineId: number): Promise<void> {
    await request<void>({
      url: `/fines/${fineId}/pay`,
      method: "POST",
      auth: true,
    });
  },
};
