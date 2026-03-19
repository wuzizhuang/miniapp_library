const {
  AUTO_LOGIN_ENABLED,
  AUTO_LOGIN_USERNAME,
  AUTO_LOGIN_PASSWORD,
} = require('./config/env')
const { libraryService } = require('./services/library')
const {
  getStoredToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredToken,
  setStoredRefreshToken,
  setStoredUser,
  clearSessionStorage,
} = require('./utils/storage')
const { authService } = require('./services/auth')
const { registerUnauthorizedHandler, registerTokenRefreshHandler } = require('./utils/request')

App({
  onLaunch() {
    this.globalData.token = getStoredToken()
    this.globalData.refreshToken = getStoredRefreshToken()
    this.globalData.user = getStoredUser()

    registerUnauthorizedHandler(() => {
      this.clearSession()

      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      const currentRoute = pages.length > 0 ? `/${pages[pages.length - 1].route}` : ''

      if (currentRoute !== '/pages/login/index') {
        wx.reLaunch({
          url: '/pages/login/index',
        })
      }
    })
    registerTokenRefreshHandler(() => this.refreshSession())

    this.globalData.bootstrapPromise = this.bootstrapSession()
  },

  setSession(session) {
    this.globalData.token = session && session.token ? session.token : ''
    this.globalData.refreshToken =
      session && Object.prototype.hasOwnProperty.call(session, 'refreshToken')
        ? (session.refreshToken || '')
        : (this.globalData.refreshToken || getStoredRefreshToken())
    this.globalData.user = session && session.user ? session.user : null
    setStoredToken(this.globalData.token)
    setStoredRefreshToken(this.globalData.refreshToken)
    setStoredUser(this.globalData.user)
  },

  async bootstrapSession() {
    if (this.globalData.token) {
      try {
        const result = await libraryService.bootstrapFromToken(this.globalData.token)
        this.setSession(result)
        return result.user
      } catch (error) {
        this.clearSession()
      }
    }

    if (!AUTO_LOGIN_ENABLED) {
      return null
    }

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

  whenReady() {
    return this.globalData.bootstrapPromise || Promise.resolve(null)
  },

  refreshSession() {
    if (this.globalData.refreshPromise) {
      return this.globalData.refreshPromise
    }

    const refreshToken = this.globalData.refreshToken || getStoredRefreshToken()

    if (!refreshToken) {
      this.clearSession()
      return Promise.resolve(null)
    }

    this.globalData.refreshPromise = authService
      .refreshSession(refreshToken)
      .then((session) => {
        const currentUser = this.globalData.user || getStoredUser()

        this.setSession({
          token: session && session.token ? session.token : '',
          refreshToken: session && session.refreshToken ? session.refreshToken : '',
          user: currentUser,
        })

        return this.globalData.token || null
      })
      .catch((error) => {
        console.warn('miniapp session refresh failed', error)
        this.clearSession()
        return null
      })
      .finally(() => {
        this.globalData.refreshPromise = null
      })

    return this.globalData.refreshPromise
  },

  async logout() {
    const refreshToken = this.globalData.refreshToken || getStoredRefreshToken()

    try {
      await authService.logout(refreshToken)
    } finally {
      this.clearSession()
    }
  },

  clearSession() {
    clearSessionStorage()
    this.globalData.token = ''
    this.globalData.refreshToken = ''
    this.globalData.user = null
    this.globalData.refreshPromise = null
  },

  isLoggedIn() {
    return Boolean(this.globalData.token)
  },

  getCurrentUser() {
    return this.globalData.user || null
  },

  globalData: {
    token: '',
    refreshToken: '',
    user: null,
    userInfo: null,
    bootstrapPromise: null,
    refreshPromise: null,
  },
})
