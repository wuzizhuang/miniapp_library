// services/api/loanService.ts
// 面向用户的借阅操作接口服务

import apiClient from "@/lib/axios";
import { ApiLoanDto, PageResponse } from "@/types/api";

/**
 * 借阅页使用的前端视图模型。
 */
export interface MyLoan {
    loanId: number;
    bookTitle: string;
    bookIsbn?: string;
    bookCover?: string;
    bookAuthorNames?: string;
    categoryName?: string;
    locationCode?: string;
    borrowDate: string;
    dueDate: string;
    returnDate?: string;
    status: "BORROWED" | "OVERDUE" | "RETURNED" | "LOST";
    daysOverdue?: number;
    daysRemaining?: number;
    renewalCount: number;
    canRenew: boolean; // 是否还可续借（后端已处理业务规则）
    copyId: number;
    bookId?: number;
}

/**
 * 将后端借阅状态转换为前端展示状态。
 */
function mapLoanStatus(status: ApiLoanDto["status"]): MyLoan["status"] {
    if (status === "ACTIVE") {
        return "BORROWED";
    }

    return status as Exclude<MyLoan["status"], "BORROWED">;
}

/**
 * 将后端借阅 DTO 转换为前端借阅视图对象。
 */
function mapApiLoanToMyLoan(dto: ApiLoanDto): MyLoan {
    const MAX_RENEWALS = 2;
    const canRenew =
        (dto.renewalCount ?? 0) < MAX_RENEWALS &&
        dto.status === "ACTIVE";

    return {
        loanId: dto.loanId,
        bookTitle: dto.bookTitle,
        bookIsbn: dto.bookIsbn,
        bookCover: dto.bookCoverUrl ?? undefined,
        bookAuthorNames: dto.bookAuthorNames,
        categoryName: dto.categoryName,
        locationCode: dto.locationCode,
        borrowDate: String(dto.borrowDate ?? "").slice(0, 10),
        dueDate: String(dto.dueDate ?? "").slice(0, 10),
        returnDate: dto.returnDate ? String(dto.returnDate).slice(0, 10) : undefined,
        status: mapLoanStatus(dto.status),
        daysOverdue: dto.daysOverdue,
        daysRemaining: dto.daysRemaining,
        renewalCount: dto.renewalCount ?? 0,
        canRenew,
        copyId: dto.copyId,
        bookId: dto.bookId,
    };
}

/**
 * 借阅 API 服务。
 * 负责读者借阅列表、借阅详情、续借、归还和发起借阅等请求。
 */
export const loanService = {
    /**
     * 获取当前用户的借阅记录
     * GET /api/loans/my
     */
    getMyLoans: async (): Promise<MyLoan[]> => {
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>("/loans/my", {
            params: { page: 0, size: 50 },
        });

        return (data.content ?? []).map(mapApiLoanToMyLoan);
    },

    /**
     * 获取当前用户历史借阅
     * GET /api/loans/history
     */
    getMyLoanHistory: async (): Promise<MyLoan[]> => {
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>("/loans/history", {
            params: { page: 0, size: 100 },
        });

        return (data.content ?? []).map(mapApiLoanToMyLoan);
    },

    /**
     * 获取单笔借阅详情
     * GET /api/loans/{id}
     */
    getLoanById: async (loanId: number): Promise<MyLoan> => {
        const { data } = await apiClient.get<ApiLoanDto>(`/loans/${loanId}`);

        return mapApiLoanToMyLoan(data);
    },

    /**
     * 归还图书
     * PUT /api/loans/{id}/return
     */
    returnLoan: async (loanId: number): Promise<void> => {
        await apiClient.put(`/loans/${loanId}/return`);
    },

    /**
     * 获取当前用户逾期中的借阅记录
     * GET /api/loans/my
     */
    getOverdueLoans: async (): Promise<MyLoan[]> => {
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>("/loans/my", {
            params: { page: 0, size: 100 },
        });

        return (data.content ?? [])
            .map(mapApiLoanToMyLoan)
            .filter((loan) => loan.status === "OVERDUE");
    },

    /**
     * 续借
     * PUT /api/loans/{id}/renew
     */
    renewLoan: async (loanId: number): Promise<void> => {
        await apiClient.put(`/loans/${loanId}/renew`);
    },

    /**
     * 办理借书
     * POST /api/loans
     */
    createLoan: async (copyId: number, userId?: number): Promise<void> => {
        await apiClient.post("/loans", {
            copyId,
            ...(userId != null ? { userId } : {}),
        });
    },
};
