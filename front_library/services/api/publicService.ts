import apiClient from "@/lib/axios";
import { ApiHomePageDto, ApiPublicAiChatRequest, ApiPublicAiChatResponse } from "@/types/api";

/**
 * 公共接口服务。
 * 供首页等无需登录的页面获取公开数据与 AI 对话能力。
 */
export const publicService = {
  /**
   * 获取首页聚合数据。
   * GET /api/public/home
   */
  getHomePage: async (): Promise<ApiHomePageDto> => {
    const { data } = await apiClient.get<ApiHomePageDto>("/public/home");

    return data;
  },

  /**
   * 调用公共 AI 对话代理。
   * POST /api/public/ai/chat
   */
  chatWithAi: async (payload: ApiPublicAiChatRequest): Promise<ApiPublicAiChatResponse> => {
    const { data } = await apiClient.post<ApiPublicAiChatResponse>("/public/ai/chat", payload);

    return data;
  },
};
