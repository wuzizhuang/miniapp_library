/**
 * @file 反馈服务
 * @description 封装用户反馈相关的 API 调用：
 *   - createFeedback：提交反馈（功能建议 / 问题反馈 / 服务投诉）
 *   - getMyFeedback：分页获取我的反馈历史
 */

import type {
  ApiFeedbackCreateDto,
  ApiFeedbackDto,
  PageResponse,
} from "../types/api";
import { request } from "./http";

/** 反馈服务对象 */
export const feedbackService = {
  /** 提交新的反馈 */
  async createFeedback(payload: ApiFeedbackCreateDto): Promise<ApiFeedbackDto> {
    return request<ApiFeedbackDto, ApiFeedbackCreateDto>({
      url: "/feedback",
      method: "POST",
      data: payload,
      auth: true,
    });
  },

  /** 分页获取我的反馈历史 */
  async getMyFeedback(page = 0, size = 10): Promise<PageResponse<ApiFeedbackDto>> {
    return request<PageResponse<ApiFeedbackDto>>({
      url: "/feedback/me",
      query: { page, size },
      auth: true,
    });
  },
};
