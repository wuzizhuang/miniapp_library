/**
 * @file 评论服务
 * @description 封装图书评论相关的 API 调用：
 *   - getBookReviews：获取某本书的评论列表
 *   - createReview：发表评论
 *   - getMyReviews：获取我的评论列表
 *   - updateReview：更新评论
 *   - deleteReview：删除评论
 */

import type { ApiReviewCreateDto, ApiReviewDto, PageResponse } from "../types/api";
import { request } from "./http";

/** 评论服务对象 */
export const reviewService = {
  /**
   * 获取某本书的评论列表
   * 按创建时间降序排列（最新的在前）
   */
  async getBookReviews(bookId: number, page = 0, size = 50): Promise<PageResponse<ApiReviewDto>> {
    return request<PageResponse<ApiReviewDto>>({
      url: `/books/${bookId}/reviews`,
      query: {
        page,
        size,
        sortBy: "createTime",
        direction: "DESC",
      },
    });
  },

  /** 发表新评论 */
  async createReview(payload: ApiReviewCreateDto): Promise<ApiReviewDto> {
    return request<ApiReviewDto, ApiReviewCreateDto>({
      url: "/reviews",
      method: "POST",
      data: payload,
      auth: true,
    });
  },

  /** 获取我的评论列表 */
  async getMyReviews(page = 0, size = 20): Promise<PageResponse<ApiReviewDto>> {
    return request<PageResponse<ApiReviewDto>>({
      url: "/reviews/me",
      query: { page, size },
      auth: true,
    });
  },

  /** 更新已有评论 */
  async updateReview(reviewId: number, payload: ApiReviewCreateDto): Promise<ApiReviewDto> {
    return request<ApiReviewDto, ApiReviewCreateDto>({
      url: `/reviews/${reviewId}`,
      method: "PUT",
      data: payload,
      auth: true,
    });
  },

  /** 删除评论 */
  async deleteReview(reviewId: number): Promise<void> {
    await request<void>({
      url: `/reviews/${reviewId}`,
      method: "DELETE",
      auth: true,
    });
  },
};
