// services/api/bookService.ts
// 图书相关接口服务（复用 types/api.ts 中的后端 DTO 类型）

import apiClient from "@/lib/axios";
import { ApiAuthorDto, ApiBookDto, ApiPublisherDto, PageResponse } from "@/types/api";
import { Author, Book, Category, BookQueryParams, Publisher } from "@/types/book";

/**
 * 字段映射：将后端 ApiBookDto 转换为前端 UI 使用的 Book 类型。
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
        // 后端 categoryName 是单值，这里统一转成前端使用的数组结构。
        categoryNames: dto.categoryName ? [dto.categoryName] : [],
        // 作者对象数组在列表场景下只保留姓名数组，简化渲染层处理。
        authorNames: dto.authors?.map((a) => a.name) ?? [],
        inventoryCount: dto.totalCopies ?? dto.availableCopies ?? 0,
        // 把后端 availableCopies 统一映射到前端 availableCount 字段。
        availableCount: dto.availableCopies ?? 0,
    };
}

/**
 * 图书目录相关 API 服务。
 * 统一封装图书列表、详情以及分类/作者/出版社元数据请求。
 */
export const bookService = {
    /**
     * 获取图书列表（支持关键词搜索和分类筛选）
     * GET /api/books | /api/books/search | /api/books/category/{id}
     */
    getBooks: async (params: BookQueryParams = {}): Promise<Book[]> => {
        const { keyword, categoryId, page = 0, size = 200 } = params;
        const normalizedKeyword = keyword?.trim();

        let response;

        if (normalizedKeyword) {
            response = await apiClient.get<PageResponse<ApiBookDto>>("/books/search", {
                params: {
                    keyword: normalizedKeyword,
                    page,
                    size,
                    ...(categoryId ? { categoryId } : {}),
                },
            });
        } else if (categoryId) {
            response = await apiClient.get<PageResponse<ApiBookDto>>(
                `/books/category/${categoryId}`,
                { params: { page, size } }
            );
        } else {
            response = await apiClient.get<PageResponse<ApiBookDto>>("/books", {
                params: { page, size },
            });
        }

        return (response.data.content ?? []).map(mapApiBookToBook);
    },

    /**
     * 获取单本图书详情
     * GET /api/books/{id}
     */
    getBookById: async (id: number): Promise<Book> => {
        const response = await apiClient.get<ApiBookDto>(`/books/${id}`);

        return mapApiBookToBook(response.data);
    },

    /**
     * 获取某位作者的图书分页
     * GET /api/books/author/{authorId}
     */
    getBooksByAuthor: async (
        authorId: number,
        page = 0,
        size = 12,
    ): Promise<PageResponse<Book>> => {
        const response = await apiClient.get<PageResponse<ApiBookDto>>(`/books/author/${authorId}`, {
            params: { page, size },
        });

        return {
            ...response.data,
            content: (response.data.content ?? []).map(mapApiBookToBook),
        };
    },

    /**
     * 获取分类列表
     * GET /api/categories
     */
    getCategories: async (): Promise<Category[]> => {
        const response = await apiClient.get<PageResponse<Category>>(
            "/categories",
            { params: { page: 0, size: 100 } }
        );

        return response.data.content ?? [];
    },

    /**
     * 获取作者列表
     * GET /api/authors
     */
    getAuthors: async (): Promise<Author[]> => {
        const response = await apiClient.get<PageResponse<ApiAuthorDto>>(
            "/authors",
            { params: { page: 0, size: 100 } }
        );

        return (response.data.content ?? []).map((author) => ({
            authorId: author.authorId,
            name: author.name,
            bio: author.biography,
        }));
    },

    /**
     * 获取出版社列表
     * GET /api/publishers
     */
    getPublishers: async (): Promise<Publisher[]> => {
        const response = await apiClient.get<PageResponse<ApiPublisherDto>>(
            "/publishers",
            { params: { page: 0, size: 100 } }
        );

        return (response.data.content ?? []).map((publisher) => ({
            publisherId: publisher.publisherId,
            name: publisher.name,
            address: publisher.address,
        }));
    },
};
