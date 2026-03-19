import apiClient from "@/lib/axios";
import { ApiHomePageDto, ApiPublicAiChatRequest, ApiPublicAiChatResponse } from "@/types/api";

export const publicService = {
  /**
   * Homepage aggregate data (public).
   * GET /api/public/home
   */
  getHomePage: async (): Promise<ApiHomePageDto> => {
    const { data } = await apiClient.get<ApiHomePageDto>("/public/home");

    return data;
  },

  /**
   * Homepage AI chat proxy (public).
   * POST /api/public/ai/chat
   */
  chatWithAi: async (payload: ApiPublicAiChatRequest): Promise<ApiPublicAiChatResponse> => {
    const { data } = await apiClient.post<ApiPublicAiChatResponse>("/public/ai/chat", payload);

    return data;
  },
};
