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
