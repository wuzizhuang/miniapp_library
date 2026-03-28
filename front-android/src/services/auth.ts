/**
 * @file 认证服务
 * @description 封装所有与用户认证相关的 API 调用：
 *   - login：用户名密码登录
 *   - register：新用户注册
 *   - forgotPassword：忘记密码（发送重置邮件）
 *   - validateResetToken：校验密码重置令牌
 *   - resetPassword：重置密码
 *   - getContext：获取认证上下文（角色 & 权限）
 *   - getMyProfile：获取用户资料
 *   - updateProfile：更新用户资料
 *   - refresh：刷新访问令牌
 *   - logout：登出
 *   - loginAndBootstrap：登录 + 拉取用户资料（组合操作）
 *   - bootstrapFromToken：用已有 token 恢复会话
 *
 *   辅助函数：
 *   - normalizeRoles：角色去重与统一大写
 *   - mapProfileToAuthUser：DTO → AuthUser 视图映射
 *   - createFallbackUser：资料接口不可用时的降级用户构造
 */

import type {
  ApiAuthContextDto,
  ApiAuthResponse,
  ApiForgotPasswordRequest,
  ApiForgotPasswordResponse,
  ApiLoginRequest,
  ApiProfileUpdateDto,
  ApiRefreshTokenRequest,
  ApiRegisterRequest,
  ApiResetPasswordRequest,
  ApiResetPasswordValidateResponse,
  ApiUserProfileDto,
} from "../types/api";
import type { AuthUser } from "../types/auth";
import { request } from "./http";

/**
 * 角色标准化
 * 去重、统一转为大写；无角色时默认添加 USER
 */
function normalizeRoles(primaryRole?: string, roles?: string[]): string[] {
  const roleSet = new Set<string>();

  if (primaryRole) {
    roleSet.add(primaryRole.toUpperCase());
  }

  for (const role of roles ?? []) {
    if (role) {
      roleSet.add(role.toUpperCase());
    }
  }

  // 保底：至少有一个 USER 角色
  if (roleSet.size === 0) {
    roleSet.add("USER");
  }

  return Array.from(roleSet);
}

/**
 * 将用户资料 DTO 映射为前端 AuthUser 视图模型
 * @param profile - 后端返回的用户资料 DTO
 * @param session - 可选的会话上下文（用于获取角色列表和权限）
 */
function mapProfileToAuthUser(
  profile: ApiUserProfileDto,
  session?: ApiAuthResponse | ApiAuthContextDto,
): AuthUser {
  return {
    userId: profile.userId,
    username: profile.username,
    email: profile.email,
    fullName: profile.fullName || profile.username,
    role: profile.role,
    roles: normalizeRoles(profile.role, session?.roles),
    permissions: session?.permissions ?? [],
  };
}

/**
 * 降级用户构造
 * 当 getMyProfile 调用失败时，用 login 返回的基本信息构造用户对象
 */
function createFallbackUser(authResponse: ApiAuthResponse): AuthUser {
  return {
    userId: authResponse.userId,
    username: authResponse.username,
    email: `${authResponse.username}@library.local`,
    fullName: authResponse.username,
    role: authResponse.role,
    roles: normalizeRoles(authResponse.role, authResponse.roles),
  };
}

/** 认证服务对象，聚合所有认证相关 API */
export const authService = {
  /** 用户登录 */
  async login(payload: ApiLoginRequest): Promise<ApiAuthResponse> {
    return request<ApiAuthResponse, ApiLoginRequest>({
      url: "/auth/login",
      method: "POST",
      data: payload,
    });
  },

  /** 用户注册 */
  async register(payload: ApiRegisterRequest): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto, ApiRegisterRequest>({
      url: "/auth/register",
      method: "POST",
      data: payload,
    });
  },

  /** 忘记密码 - 发送重置邮件 */
  async forgotPassword(
    payload: ApiForgotPasswordRequest,
  ): Promise<ApiForgotPasswordResponse> {
    return request<ApiForgotPasswordResponse, ApiForgotPasswordRequest>({
      url: "/auth/forgot-password",
      method: "POST",
      data: payload,
    });
  },

  /** 校验密码重置令牌是否有效 */
  async validateResetToken(token: string): Promise<ApiResetPasswordValidateResponse> {
    return request<ApiResetPasswordValidateResponse>({
      url: "/auth/reset-password/validate",
      query: { token },
    });
  },

  /** 重置密码 */
  async resetPassword(
    payload: ApiResetPasswordRequest,
  ): Promise<ApiForgotPasswordResponse> {
    return request<ApiForgotPasswordResponse, ApiResetPasswordRequest>({
      url: "/auth/reset-password",
      method: "POST",
      data: payload,
    });
  },

  /** 获取认证上下文（角色和权限列表） */
  async getContext(tokenOverride?: string): Promise<ApiAuthContextDto> {
    return request<ApiAuthContextDto>({
      url: "/auth/context",
      auth: true,
      tokenOverride,
    });
  },

  /** 获取当前用户资料 */
  async getMyProfile(tokenOverride?: string): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto>({
      url: "/users/me/profile",
      auth: true,
      tokenOverride,
    });
  },

  /** 更新当前用户资料 */
  async updateProfile(payload: ApiProfileUpdateDto): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto, ApiProfileUpdateDto>({
      url: "/users/me/profile",
      method: "PUT",
      data: payload,
      auth: true,
    });
  },

  /** 使用刷新令牌获取新的访问令牌 */
  async refresh(refreshToken: string): Promise<ApiAuthResponse> {
    return request<ApiAuthResponse, ApiRefreshTokenRequest>({
      url: "/auth/refresh",
      method: "POST",
      data: { refreshToken },
      skipAuthRefresh: true,  // 令牌刷新请求本身不应触发再次刷新
    });
  },

  /**
   * 登出
   * 即使后端登出调用失败，也不应阻塞本地会话清除
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      await request<void, { refreshToken?: string }>({
        url: "/auth/logout",
        method: "POST",
        auth: true,
        data: refreshToken ? { refreshToken } : undefined,
        skipAuthRefresh: true,
      });
    } catch {
      // 后端登出失败时静默忽略，不阻塞本地登出流程
    }
  },

  /**
   * 登录并引导（组合操作）
   * 1. 调用 login 获取 session
   * 2. 用新 token 拉取用户资料
   * 3. 资料拉取失败时使用降级用户
   */
  async loginAndBootstrap(payload: ApiLoginRequest): Promise<{
    session: ApiAuthResponse;
    user: AuthUser;
  }> {
    const session = await this.login(payload);

    try {
      const profile = await this.getMyProfile(session.token);
      return {
        session,
        user: mapProfileToAuthUser(profile, session),
      };
    } catch {
      return {
        session,
        user: createFallbackUser(session),
      };
    }
  },

  /**
   * 从已有 token 恢复用户会话
   * 并行获取上下文和资料，上下文失败时仅用资料降级
   */
  async bootstrapFromToken(token: string): Promise<AuthUser> {
    try {
      const [context, profile] = await Promise.all([
        this.getContext(token),
        this.getMyProfile(token),
      ]);

      return mapProfileToAuthUser(profile, context);
    } catch {
      const profile = await this.getMyProfile(token);

      return mapProfileToAuthUser(profile);
    }
  },
};
