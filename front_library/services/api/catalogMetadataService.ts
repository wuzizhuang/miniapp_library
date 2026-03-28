import apiClient from "@/lib/axios";
import { ApiAuthorDto, ApiCategoryDto, ApiPublisherDto, PageResponse } from "@/types/api";

/**
 * 图书元数据接口服务。
 * 负责作者、分类、出版社等字典型数据的查询与维护。
 */
export const catalogMetadataService = {
  getAuthors: async (page = 0, size = 10): Promise<PageResponse<ApiAuthorDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiAuthorDto>>("/authors", {
      params: { page, size, sortBy: "name", direction: "asc" },
    });

    return data;
  },

  searchAuthors: async (name: string, page = 0, size = 10): Promise<PageResponse<ApiAuthorDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiAuthorDto>>("/authors/search", {
      params: { name, page, size },
    });

    return data;
  },

  createAuthor: async (payload: Partial<ApiAuthorDto>): Promise<ApiAuthorDto> => {
    const { data } = await apiClient.post<ApiAuthorDto>("/authors", payload);

    return data;
  },

  updateAuthor: async (authorId: number, payload: Partial<ApiAuthorDto>): Promise<ApiAuthorDto> => {
    const { data } = await apiClient.put<ApiAuthorDto>(`/authors/${authorId}`, payload);

    return data;
  },

  deleteAuthor: async (authorId: number): Promise<void> => {
    await apiClient.delete(`/authors/${authorId}`);
  },

  getCategories: async (page = 0, size = 50): Promise<PageResponse<ApiCategoryDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiCategoryDto>>("/categories", {
      params: { page, size },
    });

    return data;
  },

  createCategory: async (payload: Partial<ApiCategoryDto>): Promise<ApiCategoryDto> => {
    const { data } = await apiClient.post<ApiCategoryDto>("/categories", payload);

    return data;
  },

  updateCategory: async (categoryId: number, payload: Partial<ApiCategoryDto>): Promise<ApiCategoryDto> => {
    const { data } = await apiClient.put<ApiCategoryDto>(`/categories/${categoryId}`, payload);

    return data;
  },

  deleteCategory: async (categoryId: number): Promise<void> => {
    await apiClient.delete(`/categories/${categoryId}`);
  },

  getPublishers: async (page = 0, size = 50): Promise<PageResponse<ApiPublisherDto>> => {
    const { data } = await apiClient.get<PageResponse<ApiPublisherDto>>("/publishers", {
      params: { page, size },
    });

    return data;
  },

  createPublisher: async (payload: Partial<ApiPublisherDto>): Promise<ApiPublisherDto> => {
    const { data } = await apiClient.post<ApiPublisherDto>("/publishers", payload);

    return data;
  },

  updatePublisher: async (publisherId: number, payload: Partial<ApiPublisherDto>): Promise<ApiPublisherDto> => {
    const { data } = await apiClient.put<ApiPublisherDto>(`/publishers/${publisherId}`, payload);

    return data;
  },

  deletePublisher: async (publisherId: number): Promise<void> => {
    await apiClient.delete(`/publishers/${publisherId}`);
  },
};
