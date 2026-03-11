const { libraryService } = require('../../services/library')

Page({
  data: {
    email: '',
    loading: false,
    errorMessage: '',
    successMessage: '',
  },

  onInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  async submit() {
    const email = String(this.data.email || '').trim()

    if (!email) {
      this.setData({
        errorMessage: '请输入邮箱',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
      successMessage: '',
    })

    try {
      const result = await libraryService.requestPasswordReset({
        email,
      })

      this.setData({
        successMessage: result && result.message ? result.message : '重置请求已提交，请查看邮箱或后端日志中的重置链接。',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '重置失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },
})
