import type { ApiHomePageDto } from "../types/api";
import { getDemoHomePage } from "../demo/catalog";
import { request } from "./http";

export const publicService = {
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
