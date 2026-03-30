export type UserRole = "ADMIN" | "USER" | string;

export interface User {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  roles: string[];
  permissions: string[];
  avatar?: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  userId: number;
  username: string;
  role: string;
  roles?: string[];
  permissions?: string[];
}
