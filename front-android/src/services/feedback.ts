import type {
  ApiFeedbackCreateDto,
  ApiFeedbackDto,
  PageResponse,
} from "../types/api";
import { request } from "./http";

export const feedbackService = {
  async createFeedback(payload: ApiFeedbackCreateDto): Promise<ApiFeedbackDto> {
    return request<ApiFeedbackDto, ApiFeedbackCreateDto>({
      url: "/feedback",
      method: "POST",
      data: payload,
      auth: true,
    });
  },

  async getMyFeedback(page = 0, size = 10): Promise<PageResponse<ApiFeedbackDto>> {
    return request<PageResponse<ApiFeedbackDto>>({
      url: "/feedback/me",
      query: { page, size },
      auth: true,
    });
  },
};
