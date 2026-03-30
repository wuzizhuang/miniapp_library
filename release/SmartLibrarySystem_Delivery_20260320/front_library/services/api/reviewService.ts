import apiClient from "@/lib/axios";
import { ApiReviewCreateDto, ApiReviewDto, PageResponse } from "@/types/api";

export const reviewService = {
  /**
   * 获取图书公开评论（仅 APPROVED）
   * GET /api/books/{bookId}/reviews
   */
  getBookReviews: async (
    bookId: number,
    page = 0,
    size = 20,
  ): Promise<PageResponse<ApiReviewDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiReviewDto>>(
      `/books/${bookId}/reviews`,
      { params: { page, size, sortBy: "createTime", direction: "DESC" } },
    );

    return data;
  },

  /**
   * 提交评论
   * POST /api/reviews
   */
  createReview: async (payload: ApiReviewCreateDto): Promise<ApiReviewDto> => {
    const { data } = await apiClient.post<ApiReviewDto>("/reviews", payload);

    return data;
  },

  /**
   * 我的评论
   * GET /api/reviews/me
   */
  getMyReviews: async (
    page = 0,
    size = 20,
  ): Promise<PageResponse<ApiReviewDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiReviewDto>>(
      "/reviews/me",
      { params: { page, size } },
    );

    return data;
  },

  /**
   * 更新评论
   * PUT /api/reviews/{id}
   */
  updateReview: async (
    reviewId: number,
    payload: ApiReviewCreateDto,
  ): Promise<ApiReviewDto> => {
    const { data } = await apiClient.put<ApiReviewDto>(
      `/reviews/${reviewId}`,
      payload,
    );

    return data;
  },

  /**
   * 删除评论
   * DELETE /api/reviews/{id}
   */
  deleteReview: async (reviewId: number): Promise<void> => {
    await apiClient.delete(`/reviews/${reviewId}`);
  },

  /**
   * 获取待审核评论（管理员）
   * GET /api/admin/reviews/pending
   */
  getPendingReviews: async (
    page = 0,
    size = 10,
  ): Promise<PageResponse<ApiReviewDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiReviewDto>>(
      "/admin/reviews/pending",
      { params: { page, size } },
    );

    return data;
  },

  /**
   * 获取评论审核列表（管理员）
   * GET /api/admin/reviews
   */
  getAdminReviews: async (
    page = 0,
    size = 10,
    options?: {
      status?: "PENDING" | "APPROVED" | "REJECTED";
      keyword?: string;
    },
  ): Promise<PageResponse<ApiReviewDto>> => {
    const params: Record<string, unknown> = { page, size };

    if (options?.status) {
      params.status = options.status;
    }
    if (options?.keyword?.trim()) {
      params.keyword = options.keyword.trim();
    }

    const { data } = await apiClient.get<PageResponse<ApiReviewDto>>(
      "/admin/reviews",
      { params },
    );

    return data;
  },

  /**
   * 审核评论（管理员）
   * PUT /api/admin/reviews/{id}/audit?approved=true|false
   */
  auditReview: async (
    reviewId: number,
    approved: boolean,
  ): Promise<ApiReviewDto> => {
    const { data } = await apiClient.put<ApiReviewDto>(
      `/admin/reviews/${reviewId}/audit`,
      null,
      { params: { approved } },
    );

    return data;
  },
};
