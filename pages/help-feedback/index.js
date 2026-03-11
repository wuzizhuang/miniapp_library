const { libraryService } = require('../../services/library')

const CATEGORY_OPTIONS = [
  { value: 'SUGGESTION', label: '功能建议' },
  { value: 'BUG', label: '问题反馈' },
  { value: 'SERVICE', label: '服务投诉' },
]

function decorateFeedback(item) {
  const statusMap = {
    SUBMITTED: '已提交',
    RESOLVED: '已回复',
  }

  return {
    ...item,
    statusLabel: statusMap[item.status] || item.status,
    statusClass: item.status === 'RESOLVED' ? 'chip-success' : 'chip-warning',
    createDate: String(item.createTime || '').replace('T', ' ').slice(0, 16),
  }
}

Page({
  data: {
    items: [],
    categoryOptions: CATEGORY_OPTIONS,
    category: 'SUGGESTION',
    subject: '',
    content: '',
    loading: true,
    submitting: false,
    errorMessage: '',
  },

  onShow() {
    this.loadFeedback()
  },

  async loadFeedback() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getFeedback()
      this.setData({
        items: (items || []).map(decorateFeedback),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '反馈加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  pickCategory(event) {
    this.setData({
      category: event.currentTarget.dataset.category,
    })
  },

  onSubjectInput(event) {
    this.setData({
      subject: event.detail.value,
    })
  },

  onContentInput(event) {
    this.setData({
      content: event.detail.value,
    })
  },

  async submitFeedback() {
    const subject = String(this.data.subject || '').trim()
    const content = String(this.data.content || '').trim()

    if (!subject || !content) {
      wx.showToast({
        title: '请填写主题和内容',
        icon: 'none',
      })
      return
    }

    this.setData({
      submitting: true,
    })

    try {
      await libraryService.submitFeedback({
        category: this.data.category,
        subject,
        content,
      })

      wx.showToast({
        title: '反馈已提交',
        icon: 'success',
      })

      this.setData({
        subject: '',
        content: '',
      })

      await this.loadFeedback()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '提交失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        submitting: false,
      })
    }
  },
})
