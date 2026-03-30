/**
 * @file 图书服务
 * @description 封装图书目录相关的 API 调用：
 *   - getBooks：获取图书列表（支持搜索、分类筛选、排序）
 *   - getBookById：获取单本图书详情
 *   - getCategories：获取分类列表
 *
 *   离线降级：所有接口在网络失败时自动回退到 Demo 数据
 */

import type { ApiBookDto, ApiCategoryDto, PageResponse } from "../types/api";
import { getDemoBookById, getDemoCategories, searchDemoBooks } from "../demo/catalog";
import type { Book, BookListQuery, CategoryOption, PagedResult } from "../types/book";
import { request } from "./http";

/**
 * 将后端 DTO 映射为前端 Book 视图模型
 * - 展开作者列表为名称数组
 * - 计算可借副本数和库存总数
 */
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

/**
 * 将后端分页响应映射为统一的分页结果
 * @template T - 列表项类型
 */
function mapPage<T>(page: PageResponse<T>): PagedResult<T> {
  return {
    items: page.content ?? [],
    totalElements: page.totalElements ?? 0,
    totalPages: page.totalPages ?? 0,
    page: page.number ?? 0,
    size: page.size ?? 0,
  };
}

/** 图书服务对象 */
export const bookService = {
  /**
   * 获取图书列表
   *
   * 路由策略：
   * - 有高级筛选条件（关键词/分类/仅可借等）→ 使用 /books/search
   * - 无筛选条件 → 使用 /books（基础分页）
   *
   * @param query - 搜索和筛选参数
   * @returns 分页图书列表（网络失败时回退 Demo 数据）
   */
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

    // 检测是否有高级筛选条件
    const hasAdvancedFilters = Boolean(
      keyword?.trim()
      || title?.trim()
      || author?.trim()
      || publisher?.trim()
      || categoryId
      || query.availableOnly
      || sort !== "RELEVANCE",
    );

    try {
      if (hasAdvancedFilters) {
        // 使用搜索接口（支持全文搜索和多条件筛选）
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

      // 使用基础列表接口
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
    } catch {
      // 网络失败 → 回退到 Demo 数据
      return searchDemoBooks(query);
    }
  },

  /**
   * 获取单本图书详情
   * @param bookId - 图书 ID
   * @returns 图书详情（网络失败时尝试回退 Demo 数据）
   */
  async getBookById(bookId: number): Promise<Book> {
    try {
      const response = await request<ApiBookDto>({
        url: `/books/${bookId}`,
      });

      return mapApiBook(response);
    } catch (error) {
      const demoBook = getDemoBookById(bookId);
      if (demoBook) {
        return demoBook;
      }

      throw error;
    }
  },

  /**
   * 获取所有分类选项
   * @returns 分类列表（网络失败时回退 Demo 分类）
   */
  async getCategories(): Promise<CategoryOption[]> {
    try {
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
    } catch {
      return getDemoCategories();
    }
  },
};
