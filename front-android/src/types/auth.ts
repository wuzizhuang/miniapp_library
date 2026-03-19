export interface AuthUser {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  permissions?: string[];
  avatar?: string;
}
