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

  if (roleSet.size === 0) {
    roleSet.add("USER");
  }

  return Array.from(roleSet);
}

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

export const authService = {
  async login(payload: ApiLoginRequest): Promise<ApiAuthResponse> {
    return request<ApiAuthResponse, ApiLoginRequest>({
      url: "/auth/login",
      method: "POST",
      data: payload,
    });
  },

  async register(payload: ApiRegisterRequest): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto, ApiRegisterRequest>({
      url: "/auth/register",
      method: "POST",
      data: payload,
    });
  },

  async forgotPassword(
    payload: ApiForgotPasswordRequest,
  ): Promise<ApiForgotPasswordResponse> {
    return request<ApiForgotPasswordResponse, ApiForgotPasswordRequest>({
      url: "/auth/forgot-password",
      method: "POST",
      data: payload,
    });
  },

  async validateResetToken(token: string): Promise<ApiResetPasswordValidateResponse> {
    return request<ApiResetPasswordValidateResponse>({
      url: "/auth/reset-password/validate",
      query: { token },
    });
  },

  async resetPassword(
    payload: ApiResetPasswordRequest,
  ): Promise<ApiForgotPasswordResponse> {
    return request<ApiForgotPasswordResponse, ApiResetPasswordRequest>({
      url: "/auth/reset-password",
      method: "POST",
      data: payload,
    });
  },

  async getContext(tokenOverride?: string): Promise<ApiAuthContextDto> {
    return request<ApiAuthContextDto>({
      url: "/auth/context",
      auth: true,
      tokenOverride,
    });
  },

  async getMyProfile(tokenOverride?: string): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto>({
      url: "/users/me/profile",
      auth: true,
      tokenOverride,
    });
  },

  async updateProfile(payload: ApiProfileUpdateDto): Promise<ApiUserProfileDto> {
    return request<ApiUserProfileDto, ApiProfileUpdateDto>({
      url: "/users/me/profile",
      method: "PUT",
      data: payload,
      auth: true,
    });
  },

  async refresh(refreshToken: string): Promise<ApiAuthResponse> {
    return request<ApiAuthResponse, ApiRefreshTokenRequest>({
      url: "/auth/refresh",
      method: "POST",
      data: { refreshToken },
      skipAuthRefresh: true,
    });
  },

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
      // Mirror the web client: backend logout failure should not block local sign-out.
    }
  },

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
