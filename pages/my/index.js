const { libraryService } = require('../../services/library')

const ENTRY_LIST = [
  { title: '我的书架', desc: '收藏、当前借阅和历史借阅', url: '/pages/my/shelf/index' },
  { title: '我的预约', desc: '查看排队与待取书', url: '/pages/my/reservations/index' },
  { title: '我的罚款', desc: '处理待缴罚款', url: '/pages/my/fines/index' },
  { title: '我的通知', desc: '阅读与清理通知中心', url: '/pages/my/notifications/index' },
  { title: '帮助反馈', desc: '提交建议与查看回复', url: '/pages/help-feedback/index' },
  { title: '个人资料', desc: '维护基础信息与兴趣标签', url: '/pages/my/profile/index' },
  { title: '服务预约', desc: '咨询、取书与服务排期', url: '/pages/my/appointments/index' },
  { title: '推荐动态', desc: '老师荐书与我的分享', url: '/pages/my/recommendations/index' },
]

Page({
  data: {
    user: null,
    overview: null,
    loading: true,
    errorMessage: '',
    entries: ENTRY_LIST,
  },

  onShow() {
    this.loadPageData()
  },

  async loadPageData() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const [user, overview] = await Promise.all([
        libraryService.getMyProfile(),
        libraryService.getMyOverview(),
      ])

      this.setData({
        user,
        overview,
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '我的中心加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  openPage(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.url,
    })
  },

  openLoan(event) {
    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${event.currentTarget.dataset.loanId}`,
    })
  },

  logout() {
    getApp().clearSession()
    wx.reLaunch({
      url: '/pages/login/index',
    })
  },
})
