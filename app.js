const {
  AUTO_LOGIN_ENABLED,
  AUTO_LOGIN_USERNAME,
  AUTO_LOGIN_PASSWORD,
} = require('./config/env')
const { libraryService } = require('./services/library')
const {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearSessionStorage,
} = require('./utils/storage')
const { registerUnauthorizedHandler } = require('./utils/request')

App({
  onLaunch() {
    this.globalData.token = getStoredToken()
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

    this.globalData.bootstrapPromise = this.bootstrapSession()
  },

  setSession(session) {
    this.globalData.token = session && session.token ? session.token : ''
    this.globalData.user = session && session.user ? session.user : null
    setStoredToken(this.globalData.token)
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

  clearSession() {
    clearSessionStorage()
    this.globalData.token = ''
    this.globalData.user = null
  },

  isLoggedIn() {
    return Boolean(this.globalData.token)
  },

  getCurrentUser() {
    return this.globalData.user || null
  },

  globalData: {
    token: '',
    user: null,
    userInfo: null,
    bootstrapPromise: null,
  },
})
