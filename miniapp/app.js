/**
 * @file 小程序入口文件
 * @description 微信小程序的全局入口，App() 注册实例。
 *   核心职责：
 *     1. 启动时（onLaunch）从本地存储恢复 token / user 会话信息
 *     2. 注册全局的「未授权处理器」和「令牌刷新处理器」
 *     3. 执行 bootstrap 流程：验证现有 token 或自动登录
 *     4. 提供 setSession / clearSession / logout 等会话管理方法
 *     5. 通过 globalData 在页面间共享会话状态
 */

// ─── 引入依赖 ─────────────────────────────────────────────────────
/** 自动登录配置（是否启用、预设账号密码） */
const {
  AUTO_LOGIN_ENABLED,
  AUTO_LOGIN_USERNAME,
  AUTO_LOGIN_PASSWORD,
} = require('./config/env')

/** 图书馆业务服务聚合层（已包含离线降级代理） */
const { libraryService } = require('./services/library')

/** 本地存储工具：读写 token / refreshToken / user */
const {
  getStoredToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredToken,
  setStoredRefreshToken,
  setStoredUser,
  clearSessionStorage,
} = require('./utils/storage')

/** 鉴权服务（用于刷新令牌和退出登录） */
const { authService } = require('./services/auth')

/** 全局请求回调注册（401 处理 / token 刷新） */
const { registerUnauthorizedHandler, registerTokenRefreshHandler } = require('./utils/request')

// ─── 注册小程序实例 ────────────────────────────────────────────────
App({
  /**
   * 小程序初始化生命周期（冷启动时执行一次）
   *
   * 流程：
   *   1. 从本地存储恢复上次保存的 token、refreshToken 和 user
   *   2. 注册全局的 401 处理器 → 清空会话 + 跳转登录页
   *   3. 注册令牌刷新处理器 → 调用 refreshSession()
   *   4. 开始异步引导（bootstrapSession），并将 Promise 存入 globalData
   */
  onLaunch() {
    // 从本地存储恢复会话信息到内存
    this.globalData.token = getStoredToken()
    this.globalData.refreshToken = getStoredRefreshToken()
    this.globalData.user = getStoredUser()

    /**
     * 注册全局 401 未授权处理器：
     *   - 清空当前会话
     *   - 如果当前不在登录页，则使用 reLaunch 强制跳转到登录页
     */
    registerUnauthorizedHandler(() => {
      this.clearSession()

      // 获取当前页面栈，判断是否已在登录页
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      const currentRoute = pages.length > 0 ? `/${pages[pages.length - 1].route}` : ''

      if (currentRoute !== '/pages/login/index') {
        wx.reLaunch({
          url: '/pages/login/index',
        })
      }
    })

    /** 注册令牌刷新处理器 → 委托给 refreshSession() 方法 */
    registerTokenRefreshHandler(() => this.refreshSession())

    /** 启动异步引导流程（验证 token 或自动登录），保存 Promise 供页面等待 */
    this.globalData.bootstrapPromise = this.bootstrapSession()
  },

  /**
   * 全局错误处理
   * 捕获小程序运行时未处理的 JS 异常，给用户一个友好的提示
   * @param {string} msg - 错误信息
   */
  onError(msg) {
    console.error('小程序全局异常:', msg)
    wx.showToast({ title: '出现了一些问题', icon: 'none' })
  },

  /**
   * 页面不存在处理
   * 当用户访问不存在的页面时，自动重定向到首页
   * @param {Object} res - 包含不存在页面路径和查询参数的对象
   */
  onPageNotFound(res) {
    console.warn('页面不存在:', res.path)
    wx.redirectTo({ url: '/pages/index/index' })
  },

  /**
   * 保存会话信息到内存（globalData）和本地存储
   *
   * @param {Object} session - 会话数据
   * @param {string} session.token        - 访问令牌
   * @param {string} [session.refreshToken] - 刷新令牌（如果后端没返回则保留旧值）
   * @param {Object} [session.user]       - 用户信息对象
   */
  setSession(session) {
    this.globalData.token = session && session.token ? session.token : ''

    // refreshToken：如果 session 中显式包含该字段则更新，否则保留旧值
    this.globalData.refreshToken =
      session && Object.prototype.hasOwnProperty.call(session, 'refreshToken')
        ? (session.refreshToken || '')
        : (this.globalData.refreshToken || getStoredRefreshToken())

    this.globalData.user = session && session.user ? session.user : null

    // 同步写入本地存储（持久化）
    setStoredToken(this.globalData.token)
    setStoredRefreshToken(this.globalData.refreshToken)
    setStoredUser(this.globalData.user)
  },

  /**
   * 异步引导会话（冷启动时调用）
   *
   * 流程：
   *   1. 如果本地有 token → 调用后端 bootstrapFromToken 验证
   *      - 成功：保存新会话，返回用户信息
   *      - 失败：清空会话
   *   2. 如果 token 无效且启用了自动登录 → 使用预设账号密码登录
   *      - 成功：保存会话，返回用户信息
   *      - 失败：清空会话
   *   3. 其他情况返回 null（用户需手动登录）
   *
   * @returns {Promise<Object|null>} 用户信息对象，或 null
   */
  async bootstrapSession() {
    // 尝试用现有 token 恢复会话
    if (this.globalData.token) {
      try {
        const result = await libraryService.bootstrapFromToken(this.globalData.token)
        this.setSession(result)
        return result.user
      } catch (error) {
        // token 无效或过期 → 清空
        this.clearSession()
      }
    }

    // 未启用自动登录 → 直接返回 null
    if (!AUTO_LOGIN_ENABLED) {
      return null
    }

    // 自动登录
    try {
      const result = await libraryService.login({
        username: AUTO_LOGIN_USERNAME,
        password: AUTO_LOGIN_PASSWORD,
      })

      this.setSession(result)
      return result.user
    } catch (error) {
      console.warn('miniapp auto login failed', error)
      this.clearSession()
      return null
    }
  },

  /**
   * 等待引导流程完成
   * 页面在 onLoad / onShow 中可 await app.whenReady() 确保会话已就绪
   * @returns {Promise<Object|null>}
   */
  whenReady() {
    return this.globalData.bootstrapPromise || Promise.resolve(null)
  },

  /**
   * 使用 refreshToken 刷新访问令牌
   *
   * 设计要点：
   *   - 同一时刻只允许一次刷新（通过 refreshPromise 去重）
   *   - 刷新成功：更新 token + refreshToken，保留原有 user
   *   - 刷新失败：清空会话
   *
   * @returns {Promise<string|null>} 新的 accessToken，或 null
   */
  refreshSession() {
    // 已有正在进行的刷新请求 → 复用
    if (this.globalData.refreshPromise) {
      return this.globalData.refreshPromise
    }

    const refreshToken = this.globalData.refreshToken || getStoredRefreshToken()

    // 没有 refreshToken → 无法刷新
    if (!refreshToken) {
      this.clearSession()
      return Promise.resolve(null)
    }

    // 发起刷新请求
    this.globalData.refreshPromise = authService
      .refreshSession(refreshToken)
      .then((session) => {
        const currentUser = this.globalData.user || getStoredUser()

        this.setSession({
          token: session && session.token ? session.token : '',
          refreshToken: session && session.refreshToken ? session.refreshToken : '',
          user: currentUser,     // 保留当前用户信息（不需要重新拉取）
        })

        return this.globalData.token || null
      })
      .catch((error) => {
        console.warn('miniapp session refresh failed', error)
        this.clearSession()
        return null
      })
      .finally(() => {
        // 刷新完成后清除引用，允许下次再触发
        this.globalData.refreshPromise = null
      })

    return this.globalData.refreshPromise
  },

  /**
   * 退出登录
   *
   * 流程：
   *   1. 调用后端 logout 接口（通知服务端使 refreshToken 失效）
   *   2. 无论成功/失败，都清空本地会话
   */
  async logout() {
    const refreshToken = this.globalData.refreshToken || getStoredRefreshToken()

    try {
      await authService.logout(refreshToken)
    } finally {
      this.clearSession()
    }
  },

  /**
   * 清空所有会话数据（内存 + 本地存储）
   */
  clearSession() {
    clearSessionStorage()                     // 清空本地存储
    this.globalData.token = ''
    this.globalData.refreshToken = ''
    this.globalData.user = null
    this.globalData.refreshPromise = null
  },

  /**
   * 判断当前是否已登录（内存中是否有有效 token）
   * @returns {boolean}
   */
  isLoggedIn() {
    return Boolean(this.globalData.token)
  },

  /**
   * 获取当前登录用户信息
   * @returns {Object|null} 用户信息对象，或 null
   */
  getCurrentUser() {
    return this.globalData.user || null
  },

  /**
   * 全局共享数据
   * @property {string}  token            - 当前访问令牌
   * @property {string}  refreshToken     - 当前刷新令牌
   * @property {Object}  user             - 当前登录用户信息
   * @property {Object}  userInfo         - 预留的微信用户信息（暂未使用）
   * @property {Promise} bootstrapPromise - 引导流程的 Promise
   * @property {Promise} refreshPromise   - 令牌刷新流程的 Promise（去重用）
   */
  globalData: {
    token: '',
    refreshToken: '',
    user: null,
    userInfo: null,
    bootstrapPromise: null,
    refreshPromise: null,
  },
})
