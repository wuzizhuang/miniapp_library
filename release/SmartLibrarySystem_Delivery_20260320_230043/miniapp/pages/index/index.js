/**
 * @file 首页页面逻辑
 * @description 小程序的首页（Tab 页），展示：
 *   - 未登录：欢迎语 + 登录按钮
 *   - 已登录：用户概览（在借/即将到期/罚款/通知等统计）
 *   - 热门推荐图书
 *
 *   页面使用 onShow 生命周期加载数据，
 *   在每次切回首页时都会刷新。
 */

// 引入图书馆聚合服务
const { libraryService } = require('../../services/library')

Page({
  /**
   * 页面数据
   * @property {Object|null} homeData - 首页公共数据（热门图书等）
   * @property {Object|null} user     - 当前登录用户信息
   * @property {Object|null} overview - 用户概览统计（在借数/预约数等）
   * @property {boolean} loading      - 是否正在加载
   * @property {string} errorMessage  - 错误提示信息
   */
  data: {
    homeData: null,
    user: null,
    overview: null,
    loading: true,
    errorMessage: '',
  },

  /**
   * 页面显示时触发
   * 每次切回首页都重新加载数据，确保数据实时
   */
  onShow() {
    this.loadPageData()
  },

  /**
   * 加载首页数据
   *
   * 流程：
   *   1. 等待 App 初始化完成（app.whenReady）
   *   2. 并行请求首页公共数据和用户概览
   *   3. 已登录用户额外获取概览统计
   */
  async loadPageData() {
    const app = getApp()

    // 等待 App 的 bootstrapSession 完成
    await app.whenReady()

    // 设置加载状态，并同步当前用户信息
    this.setData({
      loading: true,
      errorMessage: '',
      user: app.getCurrentUser(),
    })

    try {
      const currentUser = app.getCurrentUser()

      // 并行请求：首页数据 + 用户概览（未登录则跳过概览）
      const [homeData, overview] = await Promise.all([
        libraryService.getHomePage(),
        currentUser ? libraryService.getMyOverview() : Promise.resolve(null),
      ])

      this.setData({
        homeData,
        overview,
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '首页数据加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  /**
   * 跳转到登录页面
   */
  goLogin() {
    wx.navigateTo({
      url: '/pages/login/index',
    })
  },

  /**
   * 退出登录
   * 清除会话 → 提示 → 跳转到登录页
   */
  async logout() {
    await getApp().logout()
    this.setData({
      user: null,
    })
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
    })
    wx.reLaunch({
      url: '/pages/login/index',
    })
  },

  /**
   * 跳转到图书目录页
   */
  goBooks() {
    wx.switchTab({
      url: '/pages/books/index',
    })
  },

  /**
   * 跳转到"我的"页面
   */
  goMy() {
    wx.switchTab({
      url: '/pages/my/index',
    })
  },

  /**
   * 点击推荐图书，跳转到图书详情页
   * @param {Object} event - 点击事件对象，data-book-id 携带图书 ID
   */
  openBook(event) {
    const bookId = event.currentTarget.dataset.bookId

    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${bookId}`,
    })
  },
})
