import type { ApiSearchLogDto, PageResponse } from "../types/api";
import { getDemoHotKeywords, getDemoSuggestions } from "../demo/catalog";
import { request } from "./http";

export const searchService = {
  async getHotKeywords(limit = 8): Promise<string[]> {
    try {
      const response = await request<string[]>({
        url: "/search/hot",
        query: { limit },
      });

      return response ?? [];
    } catch {
      return getDemoHotKeywords(limit);
    }
  },

  async getSuggestions(keyword: string, limit = 8): Promise<string[]> {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return [];
    }

    try {
      const response = await request<string[]>({
        url: "/search/suggestions",
        query: {
          keyword: normalizedKeyword,
          limit,
        },
      });

      return response ?? [];
    } catch {
      return getDemoSuggestions(normalizedKeyword, limit);
    }
  },

  async getMyHistory(page = 0, size = 20): Promise<PageResponse<ApiSearchLogDto>> {
    return request<PageResponse<ApiSearchLogDto>>({
      url: "/search/history",
      query: { page, size },
      auth: true,
    });
  },
};
