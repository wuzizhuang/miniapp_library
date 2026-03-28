import apiClient from "@/lib/axios";
import { ApiBookLocationMapDto } from "@/types/api";

/**
 * 图书馆藏地图接口服务。
 */
export const bookLocationMapService = {
  getByBookId: async (bookId: number): Promise<ApiBookLocationMapDto> => {
    const { data } = await apiClient.get<ApiBookLocationMapDto>(`/books/${bookId}/location-map`);

    return data;
  },
};
