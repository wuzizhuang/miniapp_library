import type { ApiBookDto, PageResponse } from "../types/api";
import type { Book } from "../types/book";
import { request } from "./http";

function mapApiBook(dto: ApiBookDto): Book {
  return {
    bookId: dto.bookId,
    title: dto.title,
    isbn: dto.isbn,
    coverUrl: dto.coverUrl,
    description: dto.description,
    publisherName: dto.publisherName,
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    categoryNames: dto.categoryName ? [dto.categoryName] : [],
    authorNames: dto.authors?.map((author) => author.name) ?? [],
    language: dto.language,
    publishedYear: dto.publishedYear,
    availableCopies: dto.availableCopies ?? 0,
    totalCopies: dto.totalCopies ?? dto.availableCopies ?? 0,
    pendingReservationCount: dto.pendingReservationCount ?? 0,
    inventoryCount: dto.totalCopies ?? dto.availableCopies ?? 0,
    resourceMode: dto.resourceMode,
    onlineAccessUrl: dto.onlineAccessUrl,
    onlineAccessType: dto.onlineAccessType,
    avgRating: dto.avgRating,
    reviewCount: dto.reviewCount,
  };
}

export const favoriteService = {
  async getMyFavorites(page = 0, size = 100): Promise<Book[]> {
    const response = await request<PageResponse<ApiBookDto>>({
      url: "/user-favorites",
      query: { page, size },
      auth: true,
    });

    return (response.content ?? []).map(mapApiBook);
  },

  async checkFavorite(bookId: number): Promise<boolean> {
    const response = await request<boolean>({
      url: `/user-favorites/${bookId}/check`,
      auth: true,
    });

    return Boolean(response);
  },

  async addFavorite(bookId: number): Promise<void> {
    await request<void>({
      url: `/user-favorites/${bookId}`,
      method: "POST",
      auth: true,
    });
  },

  async removeFavorite(bookId: number): Promise<void> {
    await request<void>({
      url: `/user-favorites/${bookId}`,
      method: "DELETE",
      auth: true,
    });
  },
};
