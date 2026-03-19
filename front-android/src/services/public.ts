import type { ApiHomePageDto } from "../types/api";
import { request } from "./http";

export const publicService = {
  async getHomePage(): Promise<ApiHomePageDto> {
    return request<ApiHomePageDto>({
      url: "/public/home",
    });
  },
};

