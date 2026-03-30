/**
 * @file 认证用户类型定义
 * @description 定义前端认证上下文中使用的用户模型
 */

/** 已认证用户信息 */
export interface AuthUser {
  userId: number;            // 用户 ID
  username: string;          // 用户名
  email: string;             // 电子邮箱
  fullName: string;          // 全名（显示名）
  role: string;              // 主要角色（如 USER / ADMIN）
  roles: string[];           // 角色列表（标准化大写）
  permissions?: string[];    // 权限列表
  avatar?: string;           // 头像 URL
}
