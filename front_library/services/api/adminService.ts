// services/api/adminService.ts
// 管理员专用接口服务（复用 types/api.ts 中的后端 DTO 类型）

import apiClient from "@/lib/axios";
import {
    ApiBookDto,
    ApiDashboardAnalyticsDto,
    ApiDashboardBreakdownItemDto,
    ApiDashboardStatsDto,
    ApiLoanDto,
    ApiUserDto,
    ApiUserOverviewDto,
    PageResponse,
} from "@/types/api";

// ──────────────────────────────────────────────
// 对外暴露的前端视图类型（UI 组件直接使用）
// ──────────────────────────────────────────────

export interface DashboardStats {
    totalBooks: number;   // 展示总可借数量
    activeLoans: number;
    overdueLoans: number;
    pendingFines: number;
}

export interface ActivityData {
    name: string;
    borrow: number;
    return: number;
}

export interface RecentLoan {
    id: string;
    bookName: string;
    bookCover?: string;
    userName: string;
    borrowDate: string;
    dueDate: string;
    status: "active" | "overdue" | "returned";
}

export interface AdminBook {
    id: number;
    title: string;
    author: string;
    authorIds?: number[];
    authorNames?: string[];
    isbn: string;
    cover?: string;
    category: string;
    categoryId?: number;
    description?: string;
    publishedYear?: number;
    language?: string;
    publisherId?: number;
    publisherName?: string;
    resourceMode?: import("@/types/api").ApiBookResourceMode;
    onlineAccessUrl?: string;
    onlineAccessType?: import("@/types/api").ApiOnlineAccessType;
    stock: number;
    total: number;
    status: "available" | "low_stock" | "out_of_stock";
}

export interface AdminUser {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
    baseRole: string;
    roles: string[];
    permissions: string[];
    status: "active" | "banned";
    avatar?: string;
    joinDate: string;
}

export interface AdminUserDetail extends AdminUser {
    department?: string;
    major?: string;
    identityType?: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";
    enrollmentYear?: number;
    interestsTag?: string[];
}

export interface AdminUsersQuery {
    page?: number;
    size?: number;
    keyword?: string;
    role?: string;
    status?: "active" | "banned";
}

export interface AdminUsersPage {
    items: AdminUser[];
    totalPages: number;
    totalElements: number;
    page: number;
    size: number;
}

export interface AdminLoan {
    id: string;
    bookName: string;
    bookCover?: string;
    userName: string;
    borrowDate: string;
    dueDate: string;
    status: "active" | "overdue" | "returned";
}

export interface AdminCounterBorrowConfirmation {
    confirmUsername?: string;
}

export interface DashboardBreakdownItem {
    key: string;
    label: string;
    value: number;
}

export interface DashboardAnalytics {
    summary: DashboardStats;
    loanTrend: ActivityData[];
    reservationStatus: DashboardBreakdownItem[];
    fineStatus: DashboardBreakdownItem[];
    topKeywords: DashboardBreakdownItem[];
    behaviorActions: DashboardBreakdownItem[];
    recentLoans: RecentLoan[];
}

export interface AdminOverviewDueSoonLoan {
    loanId: number;
    bookId: number;
    bookTitle: string;
    dueDate: string;
    daysRemaining: number;
    status: string;
}

export interface AdminUserOverview {
    userId: number;
    username: string;
    fullName?: string;
    activeLoanCount: number;
    dueSoonLoanCount: number;
    dueSoonLoans: AdminOverviewDueSoonLoan[];
    activeReservationCount: number;
    readyReservationCount: number;
    pendingFineCount: number;
    pendingFineTotal: number;
    unreadNotificationCount: number;
    favoriteCount: number;
    pendingServiceAppointmentCount: number;
    completedServiceAppointmentCount: number;
}

export interface RbacPermission {
    permissionId: number;
    name: string;
    description?: string;
    createTime?: string;
}

export interface RbacRole {
    roleId: number;
    name: string;
    displayName?: string;
    description?: string;
    permissions: RbacPermission[];
    createTime?: string;
}

export interface CreateRoleRequest {
    name: string;
    displayName?: string;
    description?: string;
}

export interface CreatePermissionRequest {
    name: string;
    description?: string;
}

export interface RbacAuditLog {
    logId: number;
    actorUserId?: number;
    actorUsername: string;
    actionType: string;
    targetType: string;
    targetId?: string;
    detail?: string;
    createTime: string;
}

export interface RbacAuditLogFilter {
    actionType?: string;
    actorUsername?: string;
    fromTime?: string;
    toTime?: string;
}

export interface UserRoleBatchPreview {
    roleId: number;
    roleName: string;
    requestedCount: number;
    validUserCount: number;
    alreadyAssignedCount: number;
    willBeAssignedCount: number;
    willBeRevokedCount: number;
    missingUserIds: number[];
    alreadyAssignedUserIds: number[];
}

export interface UserRoleBatchResult {
    roleId: number;
    roleName: string;
    operation: "ASSIGN" | "REVOKE" | string;
    requestedCount: number;
    processedCount: number;
    affectedCount: number;
    unchangedCount: number;
    missingUserIds: number[];
    unchangedUserIds: number[];
    failedUserIds: number[];
}

export interface AdminAiGatewaySettings {
    enabled: boolean;
    provider: string;
    baseUrl?: string;
    model?: string;
    hasApiKey: boolean;
    apiKeyMasked?: string;
    updatedBy?: string;
    updateTime?: string;
}

export interface AdminAiGatewaySettingsUpdateRequest {
    enabled?: boolean;
    provider?: string;
    baseUrl?: string;
    model?: string;
    apiKey?: string;
    clearApiKey?: boolean;
}

// ──────────────────────────────────────────────
// 内部工具函数
// ──────────────────────────────────────────────

function mapLoanStatus(status: string): "active" | "overdue" | "returned" {
    const s = (status ?? "").toUpperCase();

    if (s === "OVERDUE" || s === "LOST") return "overdue";
    if (s === "RETURNED") return "returned";

    return "active";
}

function mapApiBookToAdmin(b: ApiBookDto): AdminBook {
    const availableCopies = b.availableCopies ?? 0;
    const totalCopies = b.totalCopies ?? availableCopies;

    return {
        id: b.bookId,
        title: b.title,
        author: b.authors?.[0]?.name ?? "未知",
        authorIds: b.authors?.map((author) => author.authorId) ?? [],
        authorNames: b.authors?.map((author) => author.name) ?? [],
        isbn: b.isbn ?? "-",
        cover: b.coverUrl,
        category: b.categoryName ?? "-",
        categoryId: b.categoryId,
        description: b.description,
        publishedYear: b.publishedYear,
        language: b.language,
        publisherId: b.publisherId,
        publisherName: b.publisherName,
        resourceMode: b.resourceMode,
        onlineAccessUrl: b.onlineAccessUrl,
        onlineAccessType: b.onlineAccessType,
        stock: availableCopies,
        total: totalCopies,
        status: availableCopies === 0 ? "out_of_stock" : availableCopies <= 2 ? "low_stock" : "available",
    };
}

function mapApiLoanToAdmin(loan: ApiLoanDto): AdminLoan {
    return {
        id: `LN-${loan.loanId}`,
        bookName: loan.bookTitle,
        bookCover: loan.bookCoverUrl,
        userName: loan.userFullName ?? loan.username,
        borrowDate: String(loan.borrowDate ?? "-").slice(0, 10),
        dueDate: String(loan.dueDate ?? "-").slice(0, 10),
        status: mapLoanStatus(loan.status),
    };
}

function mapApiUserToAdmin(u: ApiUserDto): AdminUser {
    const roles = Array.from(
        new Set(
            [u.role, ...(u.roles ?? [])]
                .filter(Boolean)
                .map((role) => String(role).toUpperCase()),
        ),
    );

    return {
        id: String(u.userId),
        username: u.username,
        name: u.fullName ?? u.username,
        email: u.email ?? "-",
        role: roles[0] ?? String(u.role ?? "USER").toUpperCase(),
        baseRole: String(u.role ?? "USER").toUpperCase(),
        roles,
        permissions: u.permissions ?? [],
        status: u.status === "INACTIVE" ? "banned" : "active",
        avatar: undefined,
        joinDate: u.createTime?.slice(0, 10) ?? "-",
    };
}

function mapApiUserToAdminDetail(u: ApiUserDto): AdminUserDetail {
    return {
        ...mapApiUserToAdmin(u),
        department: u.department,
        major: u.major,
        identityType: u.identityType,
        enrollmentYear: u.enrollmentYear,
        interestsTag: u.interestsTag ?? [],
    };
}

function mapBreakdownItem(item: ApiDashboardBreakdownItemDto): DashboardBreakdownItem {
    return {
        key: item.key,
        label: item.label,
        value: item.value ?? 0,
    };
}

function mapApiUserOverview(dto: ApiUserOverviewDto): AdminUserOverview {
    return {
        userId: dto.userId,
        username: dto.username,
        fullName: dto.fullName,
        activeLoanCount: dto.activeLoanCount ?? 0,
        dueSoonLoanCount: dto.dueSoonLoanCount ?? 0,
        dueSoonLoans: (dto.dueSoonLoans ?? []).map((loan) => ({
            loanId: loan.loanId,
            bookId: loan.bookId,
            bookTitle: loan.bookTitle,
            dueDate: String(loan.dueDate ?? "").slice(0, 10),
            daysRemaining: loan.daysRemaining ?? 0,
            status: loan.status,
        })),
        activeReservationCount: dto.activeReservationCount ?? 0,
        readyReservationCount: dto.readyReservationCount ?? 0,
        pendingFineCount: dto.pendingFineCount ?? 0,
        pendingFineTotal: Number(dto.pendingFineTotal ?? 0),
        unreadNotificationCount: dto.unreadNotificationCount ?? 0,
        favoriteCount: dto.favoriteCount ?? 0,
        pendingServiceAppointmentCount: dto.pendingServiceAppointmentCount ?? 0,
        completedServiceAppointmentCount: dto.completedServiceAppointmentCount ?? 0,
    };
}

// ──────────────────────────────────────────────
// adminService
// ──────────────────────────────────────────────
export const adminService = {
    // ─── Dashboard ──────────────────────────────────────────────────────────

    /**
     * 获取仪表盘核心统计
     * GET /api/admin/dashboard/stats
     */
    getDashboardStats: async (): Promise<DashboardStats> => {
        const { data: d } = await apiClient.get<ApiDashboardStatsDto>("/admin/dashboard/stats");

        return {
            totalBooks: d.availableCopies ?? 0,
            activeLoans: d.activeLoans ?? 0,
            overdueLoans: d.overdueLoans ?? 0,
            pendingFines: Number(d.totalPendingFines ?? 0),
        };
    },

    /**
     * 获取仪表盘分析数据
     * GET /api/admin/dashboard/analytics
     */
    getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
        const { data } = await apiClient.get<ApiDashboardAnalyticsDto>("/admin/dashboard/analytics");

        return {
            summary: {
                totalBooks: data.summary?.availableCopies ?? 0,
                activeLoans: data.summary?.activeLoans ?? 0,
                overdueLoans: data.summary?.overdueLoans ?? 0,
                pendingFines: Number(data.summary?.totalPendingFines ?? 0),
            },
            loanTrend: (data.loanTrend ?? []).map((point) => ({
                name: String(point.date ?? "").slice(5, 10),
                borrow: point.borrowCount ?? 0,
                return: point.returnCount ?? 0,
            })),
            reservationStatus: (data.reservationStatus ?? []).map(mapBreakdownItem),
            fineStatus: (data.fineStatus ?? []).map(mapBreakdownItem),
            topKeywords: (data.topKeywords ?? []).map(mapBreakdownItem),
            behaviorActions: (data.behaviorActions ?? []).map(mapBreakdownItem),
            recentLoans: (data.recentLoans ?? []).map((loan) => ({
                id: String(loan.loanId),
                bookName: loan.bookTitle,
                bookCover: loan.bookCoverUrl,
                userName: loan.userFullName,
                borrowDate: String(loan.borrowDate ?? "-").slice(0, 10),
                dueDate: String(loan.dueDate ?? "-").slice(0, 10),
                status: mapLoanStatus(loan.status),
            })),
        };
    },

    /**
     * 获取借阅活动图表数据（按借阅日期聚合最近7天）
     * GET /api/loans?page=0&size=100
     */
    getActivityChartData: async (): Promise<ActivityData[]> => {
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>("/loans", {
            params: { page: 0, size: 100, sortBy: "borrowDate", direction: "DESC" },
        });
        const map = new Map<string, number>();

        for (const loan of data.content ?? []) {
            const day = String(loan.borrowDate ?? "").slice(0, 10) || "未知";

            map.set(day, (map.get(day) ?? 0) + 1);
        }

        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-7)
            .map(([name, value]) => ({ name, borrow: value, return: 0 }));
    },

    /**
     * 获取最近借阅列表（仪表盘底部）
     * GET /api/loans?page=0&size=10
     */
    getRecentLoans: async (): Promise<RecentLoan[]> => {
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>("/loans", {
            params: { page: 0, size: 10, sortBy: "borrowDate", direction: "DESC" },
        });

        return (data.content ?? []).map((loan) => ({
            id: String(loan.loanId),
            bookName: loan.bookTitle,
            bookCover: undefined,
            userName: loan.userFullName ?? loan.username,
            borrowDate: String(loan.borrowDate ?? "-").slice(0, 10),
            dueDate: String(loan.dueDate ?? "-").slice(0, 10),
            status: mapLoanStatus(loan.status),
        }));
    },

    // ─── Books ──────────────────────────────────────────────────────────────

    /**
     * 获取图书列表（分页 + 搜索，ADMIN）
     * GET /api/books | /api/books/search
     */
    getAdminBooks: async (
        page: number,
        size: number,
        keyword?: string
    ): Promise<{ items: AdminBook[]; totalPages: number }> => {
        const url = keyword?.trim() ? "/books/search" : "/books";
        const params = keyword?.trim()
            ? { keyword: keyword.trim(), page, size }
            : { page, size };

        const { data } = await apiClient.get<PageResponse<ApiBookDto>>(url, { params });

        return {
            items: (data.content ?? []).map(mapApiBookToAdmin),
            totalPages: data.totalPages ?? 1,
        };
    },

    /**
     * 获取单本图书详情（管理员视角）
     * GET /api/books/{id}
     */
    getAdminBookById: async (id: number): Promise<AdminBook> => {
        const { data } = await apiClient.get<ApiBookDto>(`/books/${id}`);

        return mapApiBookToAdmin(data);
    },

    /**
     * 删除图书（ADMIN）
     * DELETE /api/books/{id}
     */
    deleteBook: async (id: number): Promise<void> => {
        await apiClient.delete(`/books/${id}`);
    },

    // ─── Users ──────────────────────────────────────────────────────────────

    /**
     * 获取所有用户（分页，ADMIN）
     * GET /api/users
     */
    getAdminUsersPage: async (query: AdminUsersQuery = {}): Promise<AdminUsersPage> => {
        const params: Record<string, unknown> = {
            page: query.page ?? 0,
            size: query.size ?? 10,
        };

        if (query.keyword?.trim()) {
            params.keyword = query.keyword.trim();
        }

        if (query.role && query.role !== "all") {
            params.role = query.role.toUpperCase();
        }

        if (query.status) {
            params.status = query.status === "active" ? "ACTIVE" : "INACTIVE";
        }

        const { data } = await apiClient.get<PageResponse<ApiUserDto>>("/users", { params });

        return {
            items: (data.content ?? []).map(mapApiUserToAdmin),
            totalPages: Math.max(1, data.totalPages ?? 1),
            totalElements: data.totalElements ?? 0,
            page: data.number ?? 0,
            size: data.size ?? 10,
        };
    },

    /**
     * 获取用户列表（兼容旧调用）
     */
    getAdminUsers: async (): Promise<AdminUser[]> => {
        const page = await adminService.getAdminUsersPage({ page: 0, size: 100 });

        return page.items;
    },

    /**
     * 更新用户状态（ADMIN）
     * PATCH /api/admin/users/{id}/status
     */
    updateAdminUserStatus: async (
        userId: number,
        status: "ACTIVE" | "INACTIVE"
    ): Promise<AdminUser> => {
        const { data } = await apiClient.patch<ApiUserDto>(`/admin/users/${userId}/status`, { status });

        return mapApiUserToAdmin(data);
    },

    /**
     * 更新用户身份类型（ADMIN）
     * PATCH /api/admin/users/{id}/identity
     */
    updateAdminUserIdentityType: async (
        userId: number,
        identityType: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR",
    ): Promise<AdminUserDetail> => {
        const { data } = await apiClient.patch<ApiUserDto>(`/admin/users/${userId}/identity`, { identityType });

        return mapApiUserToAdminDetail(data);
    },

    /**
     * 获取单个用户详情（ADMIN）
     * GET /api/users/{id}
     */
    getAdminUserById: async (userId: number): Promise<AdminUserDetail> => {
        const { data } = await apiClient.get<ApiUserDto>(`/users/${userId}`);

        return mapApiUserToAdminDetail(data);
    },

    /**
     * 获取单个用户总览（ADMIN）
     * GET /api/users/{id}/overview
     */
    getAdminUserOverview: async (userId: number): Promise<AdminUserOverview> => {
        const { data } = await apiClient.get<ApiUserOverviewDto>(`/users/${userId}/overview`);

        return mapApiUserOverview(data);
    },

    /**
     * 获取用户借阅记录（ADMIN）
     * GET /api/users/{id}/loans
     */
    getAdminUserLoans: async (userId: number, page = 0, size = 20): Promise<PageResponse<AdminLoan>> => {
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>(`/users/${userId}/loans`, {
            params: { page, size },
        });

        return {
            ...data,
            content: (data.content ?? []).map(mapApiLoanToAdmin),
        };
    },

    // ─── Loans ──────────────────────────────────────────────────────────────

    /**
     * 获取借阅列表（状态过滤，ADMIN）
     * GET /api/loans
     */
    getAdminLoans: async (filter: string = "all"): Promise<AdminLoan[]> => {
        const params: Record<string, unknown> = { page: 0, size: 100 };

        if (filter !== "all") {
            params.status = filter.toUpperCase();
        }
        const { data } = await apiClient.get<PageResponse<ApiLoanDto>>("/loans", { params });

        return (data.content ?? []).map(mapApiLoanToAdmin);
    },

    /**
     * 确认还书（ADMIN 或本人）
     * PUT /api/loans/{id}/return
     */
    returnLoan: async (id: string): Promise<void> => {
        await apiClient.put(`/loans/${id}/return`);
    },

    /**
     * 柜台代借（具备 loan:manage 的后台账号可指定 userId）
     * POST /api/loans
     */
    createLoan: async (
        copyId: number,
        userId: number,
        confirmation?: AdminCounterBorrowConfirmation,
    ): Promise<void> => {
        await apiClient.post("/loans", {
            copyId,
            userId,
            confirmUsername: confirmation?.confirmUsername,
        });
    },

    /**
     * 标记图书遗失，自动生成罚款单（ADMIN）
     * PUT /api/loans/{id}/lost
     */
    markLost: async (id: string): Promise<void> => {
        await apiClient.put(`/loans/${id}/lost`);
    },

    /**
     * 新增图书（ADMIN）
     * POST /api/books
     */
    createBook: async (body: import("@/types/api").ApiBookRequest): Promise<AdminBook> => {
        const { data } = await apiClient.post<ApiBookDto>("/books", body);

        return mapApiBookToAdmin(data);
    },

    /**
     * 更新图书（ADMIN）
     * PUT /api/books/{id}
     */
    updateBook: async (id: number, body: import("@/types/api").ApiBookRequest): Promise<AdminBook> => {
        const { data } = await apiClient.put<ApiBookDto>(`/books/${id}`, body);

        return mapApiBookToAdmin(data);
    },

    // ─── RBAC: Roles & Permissions ──────────────────────────────────────────

    /**
     * 获取角色列表（含权限）
     * GET /api/admin/roles
     */
    getRoles: async (): Promise<RbacRole[]> => {
        const { data } = await apiClient.get<RbacRole[]>("/admin/roles");

        return data ?? [];
    },

    /**
     * 新建角色
     * POST /api/admin/roles
     */
    createRole: async (body: CreateRoleRequest): Promise<RbacRole> => {
        const { data } = await apiClient.post<RbacRole>("/admin/roles", body);

        return data;
    },

    /**
     * 删除角色
     * DELETE /api/admin/roles/{id}
     */
    deleteRole: async (roleId: number): Promise<void> => {
        await apiClient.delete(`/admin/roles/${roleId}`);
    },

    /**
     * 获取权限列表
     * GET /api/admin/permissions
     */
    getPermissions: async (): Promise<RbacPermission[]> => {
        const { data } = await apiClient.get<RbacPermission[]>("/admin/permissions");

        return data ?? [];
    },

    /**
     * 新建权限
     * POST /api/admin/permissions
     */
    createPermission: async (body: CreatePermissionRequest): Promise<RbacPermission> => {
        const { data } = await apiClient.post<RbacPermission>("/admin/permissions", body);

        return data;
    },

    /**
     * 删除权限
     * DELETE /api/admin/permissions/{id}
     */
    deletePermission: async (permissionId: number): Promise<void> => {
        await apiClient.delete(`/admin/permissions/${permissionId}`);
    },

    /**
     * 给角色授予权限
     * POST /api/admin/roles/{roleId}/permissions/{permissionId}
     */
    assignPermissionToRole: async (roleId: number, permissionId: number): Promise<RbacRole> => {
        const { data } = await apiClient.post<RbacRole>(`/admin/roles/${roleId}/permissions/${permissionId}`);

        return data;
    },

    /**
     * 从角色移除权限
     * DELETE /api/admin/roles/{roleId}/permissions/{permissionId}
     */
    revokePermissionFromRole: async (roleId: number, permissionId: number): Promise<RbacRole> => {
        const { data } = await apiClient.delete<RbacRole>(`/admin/roles/${roleId}/permissions/${permissionId}`);

        return data;
    },

    /**
     * 批量给角色授予权限
     * POST /api/admin/roles/{roleId}/permissions/batch/assign
     */
    assignPermissionsToRoleBatch: async (roleId: number, permissionIds: number[]): Promise<RbacRole> => {
        const { data } = await apiClient.post<RbacRole>(`/admin/roles/${roleId}/permissions/batch/assign`, {
            permissionIds,
        });

        return data;
    },

    /**
     * 批量从角色移除权限
     * POST /api/admin/roles/{roleId}/permissions/batch/revoke
     */
    revokePermissionsFromRoleBatch: async (roleId: number, permissionIds: number[]): Promise<RbacRole> => {
        const { data } = await apiClient.post<RbacRole>(`/admin/roles/${roleId}/permissions/batch/revoke`, {
            permissionIds,
        });

        return data;
    },

    /**
     * 获取用户当前角色
     * GET /api/admin/users/{userId}/roles
     */
    getUserRoles: async (userId: number): Promise<RbacRole[]> => {
        const { data } = await apiClient.get<RbacRole[]>(`/admin/users/${userId}/roles`);

        return data ?? [];
    },

    /**
     * 给用户分配角色
     * POST /api/admin/users/{userId}/roles/{roleId}
     */
    assignRoleToUser: async (userId: number, roleId: number): Promise<void> => {
        await apiClient.post(`/admin/users/${userId}/roles/${roleId}`);
    },

    /**
     * 取消用户角色
     * DELETE /api/admin/users/{userId}/roles/{roleId}
     */
    revokeRoleFromUser: async (userId: number, roleId: number): Promise<void> => {
        await apiClient.delete(`/admin/users/${userId}/roles/${roleId}`);
    },

    /**
     * 批量给用户分配同一角色
     * POST /api/admin/roles/{roleId}/users/batch/assign
     */
    assignRoleToUsersBatch: async (roleId: number, userIds: number[]): Promise<UserRoleBatchResult> => {
        const { data } = await apiClient.post<UserRoleBatchResult>(`/admin/roles/${roleId}/users/batch/assign`, { userIds });

        return data;
    },

    /**
     * 批量撤销用户同一角色
     * POST /api/admin/roles/{roleId}/users/batch/revoke
     */
    revokeRoleFromUsersBatch: async (roleId: number, userIds: number[]): Promise<UserRoleBatchResult> => {
        const { data } = await apiClient.post<UserRoleBatchResult>(`/admin/roles/${roleId}/users/batch/revoke`, { userIds });

        return data;
    },

    /**
     * 预览批量用户角色操作影响
     * POST /api/admin/roles/{roleId}/users/batch/preview
     */
    previewRoleOperationBatch: async (
        roleId: number,
        userIds: number[],
    ): Promise<UserRoleBatchPreview> => {
        const { data } = await apiClient.post<UserRoleBatchPreview>(
            `/admin/roles/${roleId}/users/batch/preview`,
            { userIds },
        );

        return data;
    },

    /**
     * 获取 RBAC 操作审计日志
     * GET /api/admin/rbac/audits
     */
    getRbacAuditLogs: async (
        page: number = 0,
        size: number = 20,
        filter?: RbacAuditLogFilter,
    ): Promise<PageResponse<RbacAuditLog>> => {
        const { data } = await apiClient.get<PageResponse<RbacAuditLog>>("/admin/rbac/audits", {
            params: {
                page,
                size,
                actionType: filter?.actionType || undefined,
                actorUsername: filter?.actorUsername || undefined,
                fromTime: filter?.fromTime || undefined,
                toTime: filter?.toTime || undefined,
            },
        });

        return data;
    },

    /**
     * 导出 RBAC 审计日志 CSV（服务端生成）
     * GET /api/admin/rbac/audits/export
     */
    exportRbacAuditLogsCsv: async (
        filter?: RbacAuditLogFilter,
        maxRows: number = 5000,
    ): Promise<Blob> => {
        const { data } = await apiClient.get("/admin/rbac/audits/export", {
            params: {
                maxRows,
                actionType: filter?.actionType || undefined,
                actorUsername: filter?.actorUsername || undefined,
                fromTime: filter?.fromTime || undefined,
                toTime: filter?.toTime || undefined,
            },
            responseType: "blob",
        });

        return data as Blob;
    },

    /**
     * 获取 AI 网关设置
     * GET /api/admin/ai-gateway
     */
    getAiGatewaySettings: async (): Promise<AdminAiGatewaySettings> => {
        const { data } = await apiClient.get<AdminAiGatewaySettings>("/admin/ai-gateway");

        return data;
    },

    /**
     * 更新 AI 网关设置
     * PUT /api/admin/ai-gateway
     */
    updateAiGatewaySettings: async (
        body: AdminAiGatewaySettingsUpdateRequest,
    ): Promise<AdminAiGatewaySettings> => {
        const { data } = await apiClient.put<AdminAiGatewaySettings>("/admin/ai-gateway", body);

        return data;
    },
};
