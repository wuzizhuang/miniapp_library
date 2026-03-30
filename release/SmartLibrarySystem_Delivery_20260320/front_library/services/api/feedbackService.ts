import apiClient from "@/lib/axios";
import {
  ApiDashboardBreakdownItemDto,
  ApiFeedbackCreateDto,
  ApiFeedbackDto,
  ApiFeedbackFollowUpDto,
  ApiFeedbackReplyDto,
  ApiFeedbackStatus,
  PageResponse,
} from "@/types/api";

export const feedbackService = {
  /**
   * 提交反馈
   * POST /api/feedback
   */
  createFeedback: async (payload: ApiFeedbackCreateDto): Promise<ApiFeedbackDto> => {
    const { data } = await apiClient.post<ApiFeedbackDto>("/feedback", payload);

    return data;
  },

  /**
   * 获取当前用户反馈
   * GET /api/feedback/me
   */
  getMyFeedback: async (
    page = 0,
    size = 10,
  ): Promise<PageResponse<ApiFeedbackDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiFeedbackDto>>(
      "/feedback/me",
      { params: { page, size } },
    );

    return data;
  },

  /**
   * 管理员获取反馈列表
   * GET /api/admin/feedback
   */
  getAdminFeedback: async (
    page = 0,
    size = 20,
    status?: ApiFeedbackStatus,
  ): Promise<PageResponse<ApiFeedbackDto>> => {
    const params: Record<string, unknown> = { page, size };

    if (status) {
      params.status = status;
    }
    const { data } = await apiClient.get<PageResponse<ApiFeedbackDto>>(
      "/admin/feedback",
      { params },
    );

    return data;
  },

  getFeedbackStats: async (): Promise<ApiDashboardBreakdownItemDto[]> => {
    const { data } = await apiClient.get<ApiDashboardBreakdownItemDto[]>("/admin/feedback/stats");

    return data ?? [];
  },

  /**
   * 管理员回复反馈
   * PUT /api/admin/feedback/{id}/reply
   */
  replyFeedback: async (
    feedbackId: number,
    payload: ApiFeedbackReplyDto,
  ): Promise<ApiFeedbackDto> => {
    const { data } = await apiClient.put<ApiFeedbackDto>(
      `/admin/feedback/${feedbackId}/reply`,
      payload,
    );

    return data;
  },

  /**
   * 用户继续补充反馈
   * POST /api/feedback/{id}/follow-up
   */
  followUpFeedback: async (
    feedbackId: number,
    payload: ApiFeedbackFollowUpDto,
  ): Promise<ApiFeedbackDto> => {
    const { data } = await apiClient.post<ApiFeedbackDto>(
      `/feedback/${feedbackId}/follow-up`,
      payload,
    );

    return data;
  },
};
