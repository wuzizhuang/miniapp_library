import type { ApiReviewCreateDto, ApiReviewDto, PageResponse } from "../types/api";
import { request } from "./http";

export const reviewService = {
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

  async createReview(payload: ApiReviewCreateDto): Promise<ApiReviewDto> {
    return request<ApiReviewDto, ApiReviewCreateDto>({
      url: "/reviews",
      method: "POST",
      data: payload,
      auth: true,
    });
  },

  async getMyReviews(page = 0, size = 20): Promise<PageResponse<ApiReviewDto>> {
    return request<PageResponse<ApiReviewDto>>({
      url: "/reviews/me",
      query: { page, size },
      auth: true,
    });
  },

  async updateReview(reviewId: number, payload: ApiReviewCreateDto): Promise<ApiReviewDto> {
    return request<ApiReviewDto, ApiReviewCreateDto>({
      url: `/reviews/${reviewId}`,
      method: "PUT",
      data: payload,
      auth: true,
    });
  },

  async deleteReview(reviewId: number): Promise<void> {
    await request<void>({
      url: `/reviews/${reviewId}`,
      method: "DELETE",
      auth: true,
    });
  },
};
