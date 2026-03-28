/**
 * @file 收藏服务
 * @description 封装用户收藏相关的 API 调用：
 *   - getMyFavorites：获取我的收藏列表
 *   - checkFavorite：检查某本书是否已收藏
 *   - addFavorite：添加收藏
 *   - removeFavorite：取消收藏
 */

import type { ApiBookDto, PageResponse } from "../types/api";
import type { Book } from "../types/book";
import { request } from "./http";

/**
 * 将后端图书 DTO 映射为前端 Book 视图模型
 * （与 bookService 中的映射逻辑保持一致）
 */
function mapApiBook(dto: ApiBookDto): Book {
  return {
    bookId: dto.bookId,
    title: dto.title,
    isbn: dto.isbn,
    coverUrl: dto.coverUrl,
    description: dto.description,
    publisherName: dto.publisherName,
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    categoryNames: dto.categoryName ? [dto.categoryName] : [],
    authorNames: dto.authors?.map((author) => author.name) ?? [],
    language: dto.language,
    publishedYear: dto.publishedYear,
    availableCopies: dto.availableCopies ?? 0,
    totalCopies: dto.totalCopies ?? dto.availableCopies ?? 0,
    pendingReservationCount: dto.pendingReservationCount ?? 0,
    inventoryCount: dto.totalCopies ?? dto.availableCopies ?? 0,
    resourceMode: dto.resourceMode,
    onlineAccessUrl: dto.onlineAccessUrl,
    onlineAccessType: dto.onlineAccessType,
    avgRating: dto.avgRating,
    reviewCount: dto.reviewCount,
  };
}

/** 收藏服务对象 */
export const favoriteService = {
  /** 获取我的全部收藏列表（最多 100 条） */
  async getMyFavorites(page = 0, size = 100): Promise<Book[]> {
    const response = await request<PageResponse<ApiBookDto>>({
      url: "/user-favorites",
      query: { page, size },
      auth: true,
    });

    return (response.content ?? []).map(mapApiBook);
  },

  /** 检查某本书是否已被收藏 */
  async checkFavorite(bookId: number): Promise<boolean> {
    const response = await request<boolean>({
      url: `/user-favorites/${bookId}/check`,
      auth: true,
    });

    return Boolean(response);
  },

  /** 添加收藏 */
  async addFavorite(bookId: number): Promise<void> {
    await request<void>({
      url: `/user-favorites/${bookId}`,
      method: "POST",
      auth: true,
    });
  },

  /** 取消收藏 */
  async removeFavorite(bookId: number): Promise<void> {
    await request<void>({
      url: `/user-favorites/${bookId}`,
      method: "DELETE",
      auth: true,
    });
  },
};
