/**
 * @file 图书馆服务 — 会话管理领域
 * @description 创建会话相关的 libraryService 方法：
 *   - login          — 登录（调用 auth + 构建用户对象）
 *   - bootstrapFromToken — 从已有 token 恢复会话
 *   - register       — 注册（注册 + 自动登录）
 *   - requestPasswordReset — 请求密码重置
 *   - getHomePage     — 获取首页公共数据
 *   - getMyProfile    — 获取个人资料
 *   - updateProfile   — 更新个人资料
 *   - getMyOverview   — 获取用户概览统计
 */

const {
  buildSessionUserFromToken,
  getCurrentApp,
  mapProfileToSessionUser,
} = require('./shared')

/**
 * 创建会话管理领域服务
 * @param {Object} deps - 依赖注入
 * @returns {Object} 会话相关方法集合
 */
function createSessionLibraryService(deps) {
  const {
    authService,
    publicService,
    userService,
    getStoredRefreshToken,
    getStoredToken,
  } = deps

  /**
   * 登录：调用 authService.login → 用 token 构建用户对象
   * @param {Object} payload - { username, password }
   * @returns {Promise<{token, refreshToken, user}>}
   */
  async function login(payload) {
    const session = await authService.login(payload)
    const user = await buildSessionUserFromToken(authService, session.token)

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    }
  }

  return {
    login,

    /**
     * 从已有 token 恢复会话
     * @param {string} token - 本地存储的 accessToken
     * @returns {Promise<{token, refreshToken, user}>}
     */
    async bootstrapFromToken(token) {
      const user = await buildSessionUserFromToken(authService, token)

      return {
        token: getStoredToken() || token,
        refreshToken: getStoredRefreshToken() || undefined,
        user,
      }
    },

    /**
     * 注册新用户并自动登录
     * @param {Object} payload - { username, password, fullName, email }
     * @returns {Promise<{token, refreshToken, user}>}
     */
    async register(payload) {
      await authService.register({
        username: payload.username,
        password: payload.password,
        fullName: payload.fullName,
        email: payload.email,
      })

      // 注册成功后自动登录
      return login({
        username: payload.username,
        password: payload.password,
      })
    },

    /**
     * 请求密码重置（发送重置邮件）
     * @param {Object} payload - { email }
     */
    requestPasswordReset(payload) {
      return authService.forgotPassword({ email: payload.email })
    },

    /** 获取首页公共数据 */
    getHomePage() {
      return publicService.getHomePage()
    },

    /** 获取当前用户的个人资料 */
    getMyProfile() {
      return authService.getMyProfile()
    },

    /**
     * 更新个人资料
     * 更新后将 profile 映射为会话用户对象返回
     * @param {Object} payload - 要更新的字段
     * @returns {Promise<Object>} 更新后的用户对象
     */
    async updateProfile(payload) {
      const profile = await authService.updateProfile({
        fullName: payload.fullName,
        department: payload.department,
        major: payload.major,
        enrollmentYear: Number.isFinite(payload.enrollmentYear) && payload.enrollmentYear > 0
          ? payload.enrollmentYear
          : undefined,
        interestTags: Array.isArray(payload.interestTags) ? payload.interestTags : [],
      })
      // 获取当前 App 中的用户信息作为 context
      const app = getCurrentApp()
      const currentUser = app && typeof app.getCurrentUser === 'function' ? app.getCurrentUser() : null

      return mapProfileToSessionUser(profile, currentUser)
    },

    /** 获取用户概览统计（首页展示用） */
    getMyOverview() {
      return userService.getMyOverview()
    },
  }
}

module.exports = { createSessionLibraryService }
