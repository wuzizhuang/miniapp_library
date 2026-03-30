/**
 * @file 图书副本服务
 * @description 封装图书副本相关的 API 调用：
 *   - getByBookId：获取指定图书的所有副本列表
 *
 *   副本状态：AVAILABLE（可借）/ BORROWED（已外借）/ RESERVED（已预约）/ LOST（遗失）/ DAMAGED（损坏）
 */

import type { ApiBookCopyDto } from "../types/api";
import { request } from "./http";

/** 前端副本视图模型 */
export interface BookCopy {
  id: number;                    // 副本 ID
  bookId: number;                // 所属图书 ID
  bookTitle: string;             // 图书标题
  isbn: string;                  // ISBN
  status: "AVAILABLE" | "BORROWED" | "RESERVED" | "LOST" | "DAMAGED";  // 副本状态
  acquisitionDate: string;       // 入库日期
  price: number;                 // 价格
  notes?: string;                // 备注
  locationCode?: string;         // 馆藏位置编码
}

/** 将后端副本 DTO 映射为前端视图模型 */
function mapBookCopy(dto: ApiBookCopyDto): BookCopy {
  return {
    id: dto.id,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    isbn: dto.isbn,
    status: dto.status,
    acquisitionDate: dto.acquisitionDate,
    price: dto.price,
    notes: dto.notes,
    locationCode: dto.locationCode,
  };
}

/** 副本服务对象 */
export const bookCopyService = {
  /** 获取指定图书的所有副本 */
  async getByBookId(bookId: number): Promise<BookCopy[]> {
    const response = await request<ApiBookCopyDto[]>({
      url: `/books/${bookId}/copies`,
    });

    return (response ?? []).map(mapBookCopy);
  },
};
