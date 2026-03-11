const { libraryService } = require('../../../services/library')

Page({
  data: {
    form: {
      fullName: '',
      email: '',
      department: '',
      major: '',
      enrollmentYear: '',
      interestTags: '',
    },
    loading: true,
    saving: false,
    errorMessage: '',
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const profile = await libraryService.getMyProfile()
      this.setData({
        form: {
          fullName: profile.fullName || '',
          email: profile.email || '',
          department: profile.department || '',
          major: profile.major || '',
          enrollmentYear: String(profile.enrollmentYear || ''),
          interestTags: (profile.interestTags || []).join('，'),
        },
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '资料加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field
    const form = {
      ...this.data.form,
      [field]: event.detail.value,
    }

    this.setData({
      form,
    })
  },

  async saveProfile() {
    this.setData({
      saving: true,
    })

    try {
      const payload = {
        ...this.data.form,
        enrollmentYear: Number(this.data.form.enrollmentYear || 0),
        interestTags: String(this.data.form.interestTags || '')
          .split(/[，,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      }

      const user = await libraryService.updateProfile(payload)
      const app = getApp()

      app.setSession({
        token: app.globalData.token,
        user,
      })

      wx.showToast({
        title: '资料已保存',
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '保存失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        saving: false,
      })
    }
  },
})
