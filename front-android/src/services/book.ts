import type { ApiBookDto, ApiCategoryDto, PageResponse } from "../types/api";
import type { Book, BookListQuery, CategoryOption, PagedResult } from "../types/book";
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

function mapPage<T>(page: PageResponse<T>): PagedResult<T> {
  return {
    items: page.content ?? [],
    totalElements: page.totalElements ?? 0,
    totalPages: page.totalPages ?? 0,
    page: page.number ?? 0,
    size: page.size ?? 0,
  };
}

export const bookService = {
  async getBooks(query: BookListQuery = {}): Promise<PagedResult<Book>> {
    const {
      keyword,
      categoryId,
      title,
      author,
      publisher,
      page = 0,
      size = 12,
      sortBy = "title",
      direction = "ASC",
      sort = "RELEVANCE",
    } = query;

    const hasAdvancedFilters = Boolean(
      keyword?.trim()
      || title?.trim()
      || author?.trim()
      || publisher?.trim()
      || categoryId
      || query.availableOnly
      || sort !== "RELEVANCE",
    );

    if (hasAdvancedFilters) {
      const response = await request<PageResponse<ApiBookDto>>({
        url: "/books/search",
        query: {
          keyword: keyword?.trim(),
          title: title?.trim(),
          author: author?.trim(),
          publisher: publisher?.trim(),
          categoryId,
          availableOnly: query.availableOnly,
          sort,
          page,
          size,
        },
      });

      return {
        ...mapPage(response),
        items: (response.content ?? []).map(mapApiBook),
      };
    }

    const response = await request<PageResponse<ApiBookDto>>({
      url: "/books",
      query: {
        page,
        size,
        sortBy,
        direction,
      },
    });

    return {
      ...mapPage(response),
      items: (response.content ?? []).map(mapApiBook),
    };
  },

  async getBookById(bookId: number): Promise<Book> {
    const response = await request<ApiBookDto>({
      url: `/books/${bookId}`,
    });

    return mapApiBook(response);
  },

  async getCategories(): Promise<CategoryOption[]> {
    const response = await request<PageResponse<ApiCategoryDto>>({
      url: "/categories",
      query: {
        page: 0,
        size: 100,
      },
    });

    return (response.content ?? []).map((item) => ({
      categoryId: item.categoryId,
      name: item.name,
    }));
  },
};
