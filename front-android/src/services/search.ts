/**
 * @file 搜索服务
 * @description 封装搜索相关的 API 调用：
 *   - getHotKeywords：获取热门搜索关键词
 *   - getSuggestions：获取搜索建议（自动补全）
 *   - getMyHistory：获取我的搜索历史
 *
 *   离线降级：热门关键词和搜索建议在网络失败时回退到 Demo 数据
 */

import type { ApiSearchLogDto, PageResponse } from "../types/api";
import { getDemoHotKeywords, getDemoSuggestions } from "../demo/catalog";
import { request } from "./http";

/** 搜索服务对象 */
export const searchService = {
  /**
   * 获取热门搜索关键词
   * @param limit - 返回数量上限（默认 8）
   */
  async getHotKeywords(limit = 8): Promise<string[]> {
    try {
      const response = await request<string[]>({
        url: "/search/hot",
        query: { limit },
      });

      return response ?? [];
    } catch {
      // 网络失败 → 回退 Demo 热门关键词
      return getDemoHotKeywords(limit);
    }
  },

  /**
   * 获取搜索建议（输入联想 / 自动补全）
   * @param keyword - 用户输入的关键词
   * @param limit - 返回建议数量上限
   */
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
      // 网络失败 → 回退 Demo 搜索建议
      return getDemoSuggestions(normalizedKeyword, limit);
    }
  },

  /**
   * 获取我的搜索历史
   * @param page - 页码
   * @param size - 每页数量
   */
  async getMyHistory(page = 0, size = 20): Promise<PageResponse<ApiSearchLogDto>> {
    return request<PageResponse<ApiSearchLogDto>>({
      url: "/search/history",
      query: { page, size },
      auth: true,
    });
  },
};
