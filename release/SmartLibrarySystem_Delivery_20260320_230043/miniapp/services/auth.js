/**
 * @file 鉴权服务模块
 * @description 处理用户身份认证相关的所有操作：
 *   - 登录 / 注册 / 忘记密码 / 重置密码
 *   - 令牌刷新 / 退出登录
 *   - 获取认证上下文（角色和权限）
 *   - 获取 / 更新用户个人资料
 *   - 登录并引导（loginAndBootstrap）：登录 + 拉取 profile + 持久化会话
 *   - 从 token 引导（bootstrapFromToken）：用已有 token 恢复用户信息
 */

const { request } = require('../utils/request')
const {
  setStoredToken,
  setStoredRefreshToken,
  setStoredUser,
  clearSessionStorage,
} = require('../utils/storage')

// ─── 角色标准化工具 ──────────────────────────────────────────────

/**
 * 将主角色和角色数组合并为一个去重、全大写的角色列表
 *
 * @param {string} primaryRole - 主角色（如 "USER"、"ADMIN"）
 * @param {string[]} roles     - 附加角色数组
 * @returns {string[]} 标准化后的角色列表（至少包含 "USER"）
 *
 * 设计说明：
 *   后端可能在不同接口返回不同格式的角色信息，
 *   此函数统一为大写字符串数组，方便前端权限判断。
 */
function normalizeRoles(primaryRole, roles) {
  const roleSet = new Set()

  if (primaryRole) {
    roleSet.add(String(primaryRole).toUpperCase())
  }

  ;(roles || []).forEach((role) => {
    if (role) {
      roleSet.add(String(role).toUpperCase())
    }
  })

  // 如果没有任何角色，默认给 USER
  if (roleSet.size === 0) {
    roleSet.add('USER')
  }

  return Array.from(roleSet)
}

/**
 * 将后端 profile 响应映射为前端统一的用户对象
 *
 * @param {Object} profile - 后端 /users/me/profile 返回的数据
 * @param {Object} session - 登录/上下文接口返回的会话数据（含 roles / permissions）
 * @returns {Object} 前端用户对象
 */
function mapProfileToUser(profile, session) {
  return {
    userId: profile.userId,
    username: profile.username,
    email: profile.email,
    fullName: profile.fullName || profile.username,
    role: profile.role,
    roles: normalizeRoles(profile.role, session && session.roles),
    permissions: (session && session.permissions) || [],
  }
}

// ─── 鉴权服务对象 ────────────────────────────────────────────────

const authService = {
  /**
   * 用户登录
   * @param {Object} payload - { username, password }
   * @returns {Promise<Object>} 会话数据 { token, refreshToken, roles, ... }
   */
  login(payload) {
    return request({
      url: '/auth/login',
      method: 'POST',
      data: payload,
    })
  },

  /**
   * 用户注册
   * @param {Object} payload - { username, password, fullName, email }
   * @returns {Promise<Object>} 注册结果
   */
  register(payload) {
    return request({
      url: '/auth/register',
      method: 'POST',
      data: payload,
    })
  },

  /**
   * 请求重置密码（发送重置邮件）
   * @param {Object} payload - { email }
   * @returns {Promise<Object>}
   */
  forgotPassword(payload) {
    return request({
      url: '/auth/forgot-password',
      method: 'POST',
      data: payload,
    })
  },

  /**
   * 验证密码重置令牌的有效性
   * @param {string} token - 重置令牌
   * @returns {Promise<Object>}
   */
  validateResetToken(token) {
    return request({
      url: '/auth/reset-password/validate',
      query: { token },
    })
  },

  /**
   * 执行密码重置
   * @param {Object} payload - { token, newPassword }
   * @returns {Promise<Object>}
   */
  resetPassword(payload) {
    return request({
      url: '/auth/reset-password',
      method: 'POST',
      data: payload,
    })
  },

  /**
   * 使用 refreshToken 刷新会话（获取新的 accessToken）
   *
   * 注意：skipAuthRefresh = true —— 防止刷新请求本身触发二次刷新导致死循环
   * @param {string} refreshToken
   * @returns {Promise<Object>} { token, refreshToken }
   */
  refreshSession(refreshToken) {
    return request({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      skipAuthRefresh: true,
    })
  },

  /**
   * 获取当前认证上下文（角色、权限等）
   * @param {string} [tokenOverride] - 可选的 token 覆盖
   * @returns {Promise<Object>} { roles, permissions, ... }
   */
  getContext(tokenOverride) {
    return request({
      url: '/auth/context',
      auth: true,
      tokenOverride,
    })
  },

  /**
   * 获取当前登录用户的个人资料
   * @param {string} [tokenOverride] - 可选的 token 覆盖
   * @returns {Promise<Object>} profile 对象
   */
  getMyProfile(tokenOverride) {
    return request({
      url: '/users/me/profile',
      auth: true,
      tokenOverride,
    })
  },

  /**
   * 更新当前登录用户的个人资料
   * @param {Object} payload - 要更新的字段
   * @returns {Promise<Object>} 更新后的 profile 对象
   */
  updateProfile(payload) {
    return request({
      url: '/users/me/profile',
      method: 'PUT',
      data: payload,
      auth: true,
    })
  },

  /**
   * 退出登录
   *
   * 通知后端将 refreshToken 加入黑名单。
   * 即使请求失败也不报错（.catch(() => undefined)），因为本地会话已经清除。
   * skipAuthRefresh = true —— 退出登录不需要刷新 token
   *
   * @param {string} refreshToken
   * @returns {Promise<void>}
   */
  logout(refreshToken) {
    return request({
      url: '/auth/logout',
      method: 'POST',
      data: refreshToken ? { refreshToken } : undefined,
      auth: true,
      skipAuthRefresh: true,
    }).catch(() => undefined)
  },

  /**
   * 登录 + 引导（一站式）
   *
   * 流程：
   *   1. 调用 login 获取 token
   *   2. 用 token 拉取用户 profile
   *   3. 将会话信息持久化到本地存储
   *
   * @param {Object} payload - { username, password }
   * @returns {Promise<{session: Object, user: Object}>}
   */
  async loginAndBootstrap(payload) {
    const session = await this.login(payload)
    const profile = await this.getMyProfile(session.token)
    const user = mapProfileToUser(profile, session)

    // 持久化到本地存储
    setStoredToken(session.token)
    setStoredRefreshToken(session.refreshToken)
    setStoredUser(user)

    return {
      session,
      user,
    }
  },

  /**
   * 从已有 token 引导会话
   *
   * 并行拉取认证上下文和用户 profile，组装为标准用户对象。
   * 用于小程序冷启动时验证本地保存的 token 是否仍然有效。
   *
   * @param {string} token - 要验证的 accessToken
   * @returns {Promise<Object>} 用户对象
   */
  async bootstrapFromToken(token) {
    const [context, profile] = await Promise.all([
      this.getContext(token),
      this.getMyProfile(token),
    ])

    const user = mapProfileToUser(profile, context)

    // 更新本地存储
    setStoredToken(token)
    setStoredUser(user)

    return user
  },

  /**
   * 清除所有本地会话存储
   */
  clearSession() {
    clearSessionStorage()
  },
}

module.exports = {
  authService,
}
