// services/api/fineService.ts
// 罚款与信用模块接口服务

import apiClient from "@/lib/axios";
import { ApiFineDto, PageResponse } from "@/types/api";

// ─── 前端视图类型 ────────────────────────────────────────────
export type FineStatus = "PENDING" | "PAID" | "WAIVED";
export type FineType = "OVERDUE" | "LOST" | "DAMAGE";

export interface MyFine {
    fineId: number;
    loanId?: number;
    bookTitle?: string;
    amount: number;
    status: FineStatus;
    type: FineType;
    reason?: string;
    createTime: string;
    paidTime?: string;
}

export interface AdminFine extends MyFine {
    userId: number;
    username: string;
    userFullName?: string;
}

export interface AdminFinesQuery {
    page?: number;
    size?: number;
    status?: string;
    keyword?: string;
}

export interface AdminFinesPage {
    items: AdminFine[];
    totalPages: number;
    totalElements: number;
    page: number;
    size: number;
}

export interface MyFinesPage {
    items: MyFine[];
    totalPages: number;
    totalElements: number;
    page: number;
    size: number;
}

// ─── 工具函数 ────────────────────────────────────────────────
/**
 * 把后端罚款 DTO 整理成前端统一视图结构。
 */
function mapDto(dto: ApiFineDto): AdminFine {
    return {
        fineId: dto.fineId,
        loanId: dto.loanId,
        bookTitle: dto.bookTitle,
        amount: dto.amount,
        status: dto.status as FineStatus,
        type: dto.type as FineType,
        reason: dto.reason,
        createTime: String(dto.dateIssued ?? "").slice(0, 10),
        paidTime: dto.datePaid ? String(dto.datePaid).slice(0, 10) : undefined,
        userId: dto.userId,
        username: dto.username,
        userFullName: dto.userFullName,
    };
}

// ─── fineService ─────────────────────────────────────────────
export const fineService = {
    /**
     * 当前用户罚款分页
     * GET /api/fines/me
     */
    getMyFinesPage: async (page = 0, size = 10): Promise<MyFinesPage> => {
        const { data } = await apiClient.get<PageResponse<ApiFineDto>>("/fines/me", {
            params: { page, size },
        });

        return {
            items: (data.content ?? []).map(mapDto),
            totalPages: Math.max(1, data.totalPages ?? 1),
            totalElements: data.totalElements ?? 0,
            page: data.number ?? page,
            size: data.size ?? size,
        };
    },

    /**
     * 当前用户的罚款记录
     * GET /api/fines/me
     */
    getMyFines: async (): Promise<MyFine[]> => {
        const data = await fineService.getMyFinesPage(0, 100);

        return data.items;
    },

    /**
     * 所有用户罚款（管理员）
     * GET /api/fines
     */
    getAllFines: async (query: AdminFinesQuery = {}): Promise<AdminFinesPage> => {
        const params: Record<string, unknown> = {
            page: query.page ?? 0,
            size: query.size ?? 10,
        };

        if (query.status && query.status !== "all") params.status = query.status;
        if (query.keyword?.trim()) params.keyword = query.keyword.trim();
        // 后端分页对象与读者端列表组件约定不同，这里统一整理成 items + total 信息。
        const { data } = await apiClient.get<PageResponse<ApiFineDto>>("/fines", {
            params,
        });

        return {
            items: (data.content ?? []).map(mapDto),
            totalPages: Math.max(1, data.totalPages ?? 1),
            totalElements: data.totalElements ?? 0,
            page: data.number ?? 0,
            size: data.size ?? 10,
        };
    },

    /**
     * 获取全馆待缴总额（管理员）
     * GET /api/fines/pending-total
     */
    getAdminPendingTotal: async (): Promise<number> => {
        const { data } = await apiClient.get<number>("/fines/pending-total");

        return Number(data ?? 0);
    },

    /**
     * 缴纳罚款
     * POST /api/fines/{fineId}/pay
     */
    payFine: async (fineId: number): Promise<void> => {
        await apiClient.post(`/fines/${fineId}/pay`);
    },

    /**
     * 豁免罚款（管理员）
     * POST /api/fines/{fineId}/waive
     */
    waiveFine: async (fineId: number): Promise<void> => {
        await apiClient.post(`/fines/${fineId}/waive`);
    },

    /**
     * 获取未缴罚款总额（用于仪表盘）
     */
    getMyPendingTotal: async (): Promise<number> => {
        // 当前接口层没有单独总额接口，因此复用我的罚款列表做一次前端聚合。
        const fines = await fineService.getMyFines();

        return fines
            .filter((f) => f.status === "PENDING")
            .reduce((sum, f) => sum + f.amount, 0);
    },
};
