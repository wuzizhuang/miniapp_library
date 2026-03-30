import apiClient from "@/lib/axios";
import { ApiSearchLogDto, PageResponse } from "@/types/api";

/**
 * 搜索相关接口服务。
 * 包含热词、联想建议和个人搜索历史。
 */
export const searchService = {
  getHotKeywords: async (limit = 8): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>("/search/hot", {
      params: { limit },
    });

    return data ?? [];
  },

  getSuggestions: async (keyword: string, limit = 8): Promise<string[]> => {
    const normalizedKeyword = keyword.trim();

    // 空关键字不请求后端，避免输入框联想频繁触发无意义网络请求。
    if (!normalizedKeyword) {
      return [];
    }

    const { data } = await apiClient.get<string[]>("/search/suggestions", {
      params: { keyword: normalizedKeyword, limit },
    });

    return data ?? [];
  },

  getMyHistory: async (page = 0, size = 20): Promise<PageResponse<ApiSearchLogDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiSearchLogDto>>("/search/history", {
      params: { page, size },
    });

    return data;
  },
};
