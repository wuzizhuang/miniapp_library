import apiClient from "@/lib/axios";
import { ApiBookDto, PageResponse } from "@/types/api";
import { Book } from "@/types/book";

/**
 * 把后端图书 DTO 映射成前端书架使用的 Book 结构。
 */
function mapApiBookToBook(dto: ApiBookDto): Book {
  return {
    bookId: dto.bookId,
    isbn: dto.isbn ?? "",
    title: dto.title,
    coverUrl: dto.coverUrl,
    resourceMode: dto.resourceMode,
    onlineAccessUrl: dto.onlineAccessUrl,
    onlineAccessType: dto.onlineAccessType,
    description: dto.description,
    language: dto.language,
    publishYear: dto.publishedYear,
    publisherName: dto.publisherName,
    categoryId: dto.categoryId,
    categoryNames: dto.categoryName ? [dto.categoryName] : [],
    authorNames: dto.authors?.map((author) => author.name) ?? [],
    availableCount: dto.availableCopies ?? 0,
  };
}

/**
 * 收藏书架接口服务。
 */
export const favoriteService = {
  /**
   * 获取当前用户收藏书单
   * GET /api/user-favorites
   */
  getMyFavorites: async (page = 0, size = 100): Promise<Book[]> => {
    const { data } = await apiClient.get<PageResponse<ApiBookDto>>("/user-favorites", {
      params: { page, size },
    });

    // 书架页面当前使用扁平列表，这里直接提取 content。
    return (data.content ?? []).map(mapApiBookToBook);
  },

  /**
   * 检查当前用户是否已收藏图书
   * GET /api/user-favorites/{bookId}/check
   */
  checkFavorite: async (bookId: number): Promise<boolean> => {
    const { data } = await apiClient.get<boolean>(`/user-favorites/${bookId}/check`);

    return Boolean(data);
  },

  /**
   * 添加收藏
   * POST /api/user-favorites/{bookId}
   */
  addFavorite: async (bookId: number): Promise<void> => {
    await apiClient.post(`/user-favorites/${bookId}`);
  },

  /**
   * 取消收藏
   * DELETE /api/user-favorites/{bookId}
   */
  removeFavorite: async (bookId: number): Promise<void> => {
    await apiClient.delete(`/user-favorites/${bookId}`);
  },
};
