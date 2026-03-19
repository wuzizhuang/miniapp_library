import apiClient from "@/lib/axios";
import { ApiSearchLogDto, PageResponse } from "@/types/api";

export const searchService = {
  getHotKeywords: async (limit = 8): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>("/search/hot", {
      params: { limit },
    });

    return data ?? [];
  },

  getSuggestions: async (keyword: string, limit = 8): Promise<string[]> => {
    const normalizedKeyword = keyword.trim();

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
