import apiClient from "@/lib/axios";
import { ApiBookLocationMapDto } from "@/types/api";

export const bookLocationMapService = {
  getByBookId: async (bookId: number): Promise<ApiBookLocationMapDto> => {
    const { data } = await apiClient.get<ApiBookLocationMapDto>(`/books/${bookId}/location-map`);

    return data;
  },
};
