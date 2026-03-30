/**
 * @file "我的"页面逻辑
 * @description 用户中心 Tab 页，功能：
 *   - 展示当前用户基本信息
 *   - 概览统计（在借数/预约数/罚款数/通知数等）
 *   - 功能入口列表（书架/预约/评论/罚款/通知/反馈/资料/预约/座位/推荐）
 *   - 退出登录
 *   - 未登录状态提示
 */

const { libraryService } = require('../../services/library')

/**
 * 功能入口配置列表
 * 每项定义了 key（用于匹配概览数据）、标题、描述和跳转路径
 */
const ENTRY_LIST = [
  { key: 'shelf', title: '我的书架', desc: '收藏、当前借阅和历史借阅', url: '/pages/my/shelf/index' },
  { key: 'reservation', title: '我的预约', desc: '查看排队与待取书', url: '/pages/my/reservations/index' },
  { key: 'review', title: '我的评论', desc: '管理已提交书评与审核状态', url: '/pages/my/reviews/index' },
  { key: 'searchHistory', title: '搜索历史', desc: '回看最近检索记录与热门关键词', url: '/pages/my/search-history/index' },
  { key: 'fine', title: '我的罚款', desc: '处理待缴罚款', url: '/pages/my/fines/index' },
  { key: 'notification', title: '我的通知', desc: '阅读与清理通知中心', url: '/pages/my/notifications/index' },
  { key: 'feedback', title: '帮助反馈', desc: '提交建议与查看回复', url: '/pages/help-feedback/index' },
  { key: 'profile', title: '个人资料', desc: '维护基础信息与兴趣标签', url: '/pages/my/profile/index' },
  { key: 'appointment', title: '服务预约', desc: '咨询、取书与服务排期', url: '/pages/my/appointments/index' },
  { key: 'seatReservation', title: '座位预约', desc: '查询自习座位并管理预约记录', url: '/pages/my/seat-reservations/index' },
  { key: 'recommendation', title: '推荐动态', desc: '老师荐书与我的分享', url: '/pages/my/recommendations/index' },
]

/**
 * 根据概览统计数据为入口列表添加角标信息
 * 例如"3 本在借"、"2 条待缴"等
 * @param {Object|null} overview - 概览统计数据
 * @returns {Object[]} 带 badge 的入口列表
 */
function buildEntries(overview) {
  return ENTRY_LIST.map((entry) => {
    if (!overview) {
      return entry
    }

    if (entry.key === 'shelf') {
      return {
        ...entry,
        badge: overview.activeLoanCount > 0 ? `${overview.activeLoanCount} 本在借` : `${overview.favoriteCount} 个收藏`,
      }
    }

    if (entry.key === 'reservation') {
      return {
        ...entry,
        badge: overview.readyReservationCount > 0 ? `${overview.readyReservationCount} 条待取` : `${overview.activeReservationCount} 条预约`,
      }
    }

    if (entry.key === 'fine') {
      return {
        ...entry,
        badge: overview.pendingFineCount > 0 ? `${overview.pendingFineCount} 条待缴` : '无待缴记录',
      }
    }

    if (entry.key === 'notification') {
      return {
        ...entry,
        badge: overview.unreadNotificationCount > 0 ? `${overview.unreadNotificationCount} 条未读` : '已读完',
      }
    }

    if (entry.key === 'review') {
      return {
        ...entry,
        badge: '查看我的书评',
      }
    }

    if (entry.key === 'appointment') {
      return {
        ...entry,
        badge: overview.pendingServiceAppointmentCount > 0 ? `${overview.pendingServiceAppointmentCount} 条处理中` : '当前空闲',
      }
    }

    return entry
  })
}

Page({
  /**
   * 页面数据
   * @property {Object|null} user    - 当前用户信息
   * @property {Object|null} overview - 概览统计
   * @property {boolean} loading     - 加载中
   * @property {string} errorMessage - 错误信息
   * @property {Object[]} entries    - 功能入口列表（含动态角标）
   */
  data: {
    user: null,
    overview: null,
    loading: true,
    errorMessage: '',
    entries: ENTRY_LIST,
  },

  /** 每次显示页面时刷新数据 */
  onShow() {
    this.loadPageData()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadPageData({ stopPullDownRefresh: true })
  },

  /**
   * 加载页面数据
   * 并行请求用户资料和概览统计
   * 未登录时显示登录引导
   */
  async loadPageData(options) {
    const nextOptions = options || {}
    const app = getApp()

    await app.whenReady()

    // 未登录 → 显示登录引导
    if (!app.isLoggedIn()) {
      this.setData({
        loading: false,
        errorMessage: '',
        notLoggedIn: true,
      })

      if (nextOptions.stopPullDownRefresh) {
        wx.stopPullDownRefresh()
      }
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
      notLoggedIn: false,
    })

    try {
      // 并行请求用户资料和概览统计
      const [user, overview] = await Promise.all([
        libraryService.getMyProfile(),
        libraryService.getMyOverview(),
      ])

      this.setData({
        user,
        overview,
        entries: buildEntries(overview),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '我的中心加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })

      if (nextOptions.stopPullDownRefresh) {
        wx.stopPullDownRefresh()
      }
    }
  },

  /** 跳转到指定功能页面 */
  openPage(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.url,
    })
  },

  /** 跳转到借阅追踪页 */
  openLoan(event) {
    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${event.currentTarget.dataset.loanId}`,
    })
  },

  /** 退出登录 → 跳转到登录页 */
  async logout() {
    await getApp().logout()
    wx.reLaunch({
      url: '/pages/login/index',
    })
  },

  /** 跳转到登录页 */
  goLogin() {
    wx.navigateTo({
      url: '/pages/login/index',
    })
  },

  /** 重试加载 */
  retryLoadPageData() {
    this.loadPageData()
  },
})
