/**
 * @file 公共数据服务
 * @description 封装无需认证即可访问的公共 API：
 *   - getHomePage：获取首页数据（热门推荐、最新上架等）
 *
 *   离线降级：网络失败时自动回退到 Demo 数据
 */

import type { ApiHomePageDto } from "../types/api";
import { getDemoHomePage } from "../demo/catalog";
import { request } from "./http";

/** 公共数据服务对象 */
export const publicService = {
  /**
   * 获取首页聚合数据
   * 网络失败时回退到 Demo 数据
   */
  async getHomePage(): Promise<ApiHomePageDto> {
    try {
      return await request<ApiHomePageDto>({
        url: "/public/home",
      });
    } catch {
      return getDemoHomePage();
    }
  },
};
