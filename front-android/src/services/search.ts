import type { ApiSearchLogDto, PageResponse } from "../types/api";
import { request } from "./http";

export const searchService = {
  async getHotKeywords(limit = 8): Promise<string[]> {
    const response = await request<string[]>({
      url: "/search/hot",
      query: { limit },
    });

    return response ?? [];
  },

  async getSuggestions(keyword: string, limit = 8): Promise<string[]> {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return [];
    }

    const response = await request<string[]>({
      url: "/search/suggestions",
      query: {
        keyword: normalizedKeyword,
        limit,
      },
    });

    return response ?? [];
  },

  async getMyHistory(page = 0, size = 20): Promise<PageResponse<ApiSearchLogDto>> {
    return request<PageResponse<ApiSearchLogDto>>({
      url: "/search/history",
      query: { page, size },
      auth: true,
    });
  },
};
