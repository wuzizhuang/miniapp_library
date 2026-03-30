// services/api/bookCopyService.ts
// 图书副本管理接口服务

import apiClient from "@/lib/axios";
import { PageResponse } from "@/types/api";

// ─── 前端类型 ────────────────────────────────────────────────

export type CopyStatus = "AVAILABLE" | "BORROWED" | "RESERVED" | "LOST" | "DAMAGED";

export interface BookCopy {
    id: number;
    bookId: number;
    bookTitle: string;
    isbn: string;
    status: CopyStatus;
    acquisitionDate: string;
    price: number;
    notes?: string;
    locationCode?: string;
    rfidTag?: string;
    floorPlanId?: number;
    createTime?: string;
    updateTime?: string;
}

export interface BookCopyCreateRequest {
    bookId: number;
    status?: CopyStatus;
    acquisitionDate?: string;
    price?: number;
    notes?: string;
    locationCode?: string;
    rfidTag?: string;
    floorPlanId?: number;
}

export interface BookCopyUpdateRequest {
    status?: CopyStatus;
    acquisitionDate?: string;
    price?: number;
    notes?: string;
    locationCode?: string;
    rfidTag?: string;
    floorPlanId?: number;
}

// ─── API 响应 DTO ────────────────────────────────────────────

interface ApiBookCopyDto {
    id: number;
    bookId: number;
    bookTitle: string;
    isbn: string;
    status: CopyStatus;
    acquisitionDate: string;
    price: number;
    notes?: string;
    locationCode?: string;
    rfidTag?: string;
    floorPlanId?: number;
    createTime?: string;
    updateTime?: string;
}

/**
 * 副本 DTO 到前端模型的直接映射。
 */
function mapDto(dto: ApiBookCopyDto): BookCopy {
    return { ...dto };
}

// ─── Service ─────────────────────────────────────────────────

/**
 * 图书副本接口服务。
 * 既给后台副本管理页使用，也给图书详情页读取馆藏副本列表。
 */

export const bookCopyService = {
    /**
     * 分页获取所有副本（Admin）
     * GET /api/book-copies
     */
    getAll: async (
        page = 0,
        size = 10,
        sortBy = "id",
        direction = "ASC",
        status?: string,
        keyword?: string,
        bookId?: number
    ): Promise<{ items: BookCopy[]; totalPages: number; totalElements: number }> => {
        const params: Record<string, any> = { page, size, sortBy, direction };

        if (status) params.status = status;
        if (keyword) params.keyword = keyword;
        if (typeof bookId === "number") params.bookId = bookId;
        // 统一把后端 PageResponse 整理成后台表格直接可消费的结构。
        const { data } = await apiClient.get<PageResponse<ApiBookCopyDto>>("/book-copies", { params });

        return {
            items: (data.content ?? []).map(mapDto),
            totalPages: data.totalPages ?? 0,
            totalElements: data.totalElements ?? 0,
        };
    },

    /**
     * 获取单个副本
     * GET /api/book-copies/{id}
     */
    getById: async (id: number): Promise<BookCopy> => {
        const { data } = await apiClient.get<ApiBookCopyDto>(`/book-copies/${id}`);

        return mapDto(data);
    },

    /**
     * 获取某本书的全部副本
     * GET /api/books/{bookId}/copies
     */
    getByBookId: async (bookId: number): Promise<BookCopy[]> => {
        const { data } = await apiClient.get<ApiBookCopyDto[]>(`/books/${bookId}/copies`);

        return data.map(mapDto);
    },

    /**
     * 新建副本（Admin）
     * POST /api/book-copies
     */
    create: async (payload: BookCopyCreateRequest): Promise<BookCopy> => {
        const { data } = await apiClient.post<ApiBookCopyDto>("/book-copies", payload);

        return mapDto(data);
    },

    /**
     * 更新副本（Admin）
     * PUT /api/book-copies/{id}
     */
    update: async (id: number, payload: BookCopyUpdateRequest): Promise<BookCopy> => {
        const { data } = await apiClient.put<ApiBookCopyDto>(`/book-copies/${id}`, payload);

        return mapDto(data);
    },

    /**
     * 删除副本（Admin）
     * DELETE /api/book-copies/{id}
     */
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/book-copies/${id}`);
    },
};
