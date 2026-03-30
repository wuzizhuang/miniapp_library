const { libraryService } = require('../../services/library')

Page({
  data: {
    username: '',
    password: '',
    fullName: '',
    email: '',
    loading: false,
    errorMessage: '',
  },

  onInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  async submit() {
    const username = String(this.data.username || '').trim()
    const password = this.data.password || ''
    const fullName = String(this.data.fullName || '').trim()
    const email = String(this.data.email || '').trim()

    if (!username || !password || !fullName || !email) {
      this.setData({
        errorMessage: '请填写所有必填项',
      })
      return
    }

    if (password.length < 6) {
      this.setData({
        errorMessage: '密码长度不能少于 6 位',
      })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({
        errorMessage: '请输入有效的邮箱地址',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const result = await libraryService.register({
        username: this.data.username,
        password: this.data.password,
        fullName: this.data.fullName,
        email: this.data.email,
      })

      getApp().setSession({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      })

      wx.showToast({
        title: '注册成功',
        icon: 'success',
      })

      wx.reLaunch({
        url: '/pages/index/index',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '注册失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },
})
