// services/api/authService.ts
// 认证相关接口服务（复用 types/api.ts 中的后端 DTO 类型）

import type { ApiErrorInfo } from "@/lib/apiError";

import { getApiErrorInfo } from "@/lib/apiError";
import apiClient from "@/lib/axios";
import {
    ApiAuthContextDto,
    ApiAuthResponse,
    ApiForgotPasswordRequest,
    ApiForgotPasswordResponse,
    ApiLoginRequest,
    ApiProfileUpdateDto,
    ApiRegisterRequest,
    ApiResetPasswordRequest,
    ApiResetPasswordValidateResponse,
    ApiUserDto,
    ApiUserProfileDto,
} from "@/types/api";
import { User } from "@/types/auth";

function normalizeRoles(primaryRole?: string, roles?: string[]): string[] {
    const set = new Set<string>();

    if (primaryRole) {
        set.add(primaryRole.toUpperCase());
    }

    for (const role of roles ?? []) {
        if (role) {
            set.add(role.toUpperCase());
        }
    }

    if (set.size === 0) {
        set.add("USER");
    }

    return Array.from(set);
}

export type { ApiErrorInfo };
export const parseApiError = getApiErrorInfo;

export const authService = {
    /**
     * 登录并获取 JWT
     * POST /api/auth/login
     */
    login: async (payload: ApiLoginRequest): Promise<ApiAuthResponse> => {
        const { data } = await apiClient.post<ApiAuthResponse>("/auth/login", payload);

        return data;
    },

    /**
     * 注册新用户
     * POST /api/auth/register
     */
    register: async (payload: ApiRegisterRequest): Promise<ApiUserDto> => {
        const { data } = await apiClient.post<ApiUserDto>("/auth/register", payload);

        return data;
    },

    /**
     * 获取登录态上下文（包含角色+权限）
     * GET /api/auth/context
     */
    getContext: async (): Promise<User> => {
        const { data } = await apiClient.get<ApiAuthContextDto>("/auth/context");
        const roles = normalizeRoles(data.role, data.roles);

        return {
            userId: data.userId,
            username: data.username,
            email: data.email ?? `${data.username}@library.local`,
            fullName: data.fullName ?? data.username,
            role: data.role ?? roles[0] ?? "USER",
            roles,
            permissions: data.permissions ?? [],
            avatar: undefined,
        };
    },

    /**
     * 获取当前登录用户信息
     * GET /api/auth/me
     */
    getMe: async (): Promise<User> => {
        const { data } = await apiClient.get<ApiUserDto>("/auth/me");
        const roles = normalizeRoles(data.role);

        return {
            userId: data.userId,
            username: data.username,
            email: data.email ?? `${data.username}@library.local`,
            fullName: data.fullName ?? data.username,
            role: data.role as string,
            roles,
            permissions: [],
            avatar: undefined,
        };
    },

    /**
     * 获取当前用户完整个人信息（用于个人设置页面）
     * GET /api/users/me/profile
     */
    getProfile: async (): Promise<ApiUserProfileDto> => {
        const { data } = await apiClient.get<ApiUserProfileDto>("/users/me/profile");

        return data;
    },

    /**
     * 更新当前用户个人信息
     * PUT /api/users/me/profile
     */
    updateProfile: async (payload: ApiProfileUpdateDto): Promise<ApiUserProfileDto> => {
        const { data } = await apiClient.put<ApiUserProfileDto>("/users/me/profile", payload);

        return data;
    },

    /**
     * 退出登录
     * POST /api/auth/logout
     */
    loginOut: async (): Promise<void> => {
        try {
            await apiClient.post("/auth/logout");
        } catch {
            // 即使请求失败，也照常清理本地 token
        }
    },

    /**
     * 发起找回密码请求
     * POST /api/auth/forgot-password
     */
    forgotPassword: async (payload: ApiForgotPasswordRequest): Promise<ApiForgotPasswordResponse> => {
        const { data } = await apiClient.post<ApiForgotPasswordResponse>("/auth/forgot-password", payload);

        return data;
    },

    /**
     * 校验重置令牌
     * GET /api/auth/reset-password/validate
     */
    validateResetToken: async (token: string): Promise<ApiResetPasswordValidateResponse> => {
        const { data } = await apiClient.get<ApiResetPasswordValidateResponse>("/auth/reset-password/validate", {
            params: { token },
        });

        return data;
    },

    /**
     * 提交新密码
     * POST /api/auth/reset-password
     */
    resetPassword: async (payload: ApiResetPasswordRequest): Promise<ApiForgotPasswordResponse> => {
        const { data } = await apiClient.post<ApiForgotPasswordResponse>("/auth/reset-password", payload);

        return data;
    },
};
