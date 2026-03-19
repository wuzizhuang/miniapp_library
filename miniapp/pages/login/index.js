const { libraryService } = require('../../services/library')
const {
  AUTO_LOGIN_ENABLED,
  AUTO_LOGIN_USERNAME,
  AUTO_LOGIN_PASSWORD,
} = require('../../config/env')

Page({
  data: {
    username: AUTO_LOGIN_USERNAME,
    password: AUTO_LOGIN_PASSWORD,
    loading: false,
    errorMessage: '',
    autoLoginEnabled: AUTO_LOGIN_ENABLED,
  },

  async onLoad() {
    const app = getApp()

    await app.whenReady()

    if (app.isLoggedIn()) {
      wx.reLaunch({
        url: '/pages/index/index',
      })
    }
  },

  onUsernameInput(event) {
    this.setData({
      username: event.detail.value,
    })
  },

  onPasswordInput(event) {
    this.setData({
      password: event.detail.value,
    })
  },

  async onSubmit() {
    const username = String(this.data.username || '').trim()
    const password = this.data.password || ''

    if (!username || !password) {
      this.setData({
        errorMessage: '请输入用户名和密码',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const result = await libraryService.login({
        username,
        password,
      })

      getApp().setSession({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      })

      wx.showToast({
        title: '登录成功',
        icon: 'success',
      })

      wx.reLaunch({
        url: '/pages/index/index',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '登录失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  goRegister() {
    wx.navigateTo({
      url: '/pages/register/index',
    })
  },

  goForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/index',
    })
  },
})
