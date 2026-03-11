// index.js
const { libraryService } = require('../../services/library')

Page({
  data: {
    homeData: null,
    user: null,
    overview: null,
    loading: true,
    errorMessage: '',
  },

  onShow() {
    this.loadPageData()
  },

  async loadPageData() {
    const app = getApp()

    await app.whenReady()

    this.setData({
      loading: true,
      errorMessage: '',
      user: app.getCurrentUser(),
    })

    try {
      const currentUser = app.getCurrentUser()
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

  goLogin() {
    wx.navigateTo({
      url: '/pages/login/index',
    })
  },

  logout() {
    getApp().clearSession()
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

  goBooks() {
    wx.switchTab({
      url: '/pages/books/index',
    })
  },

  goMy() {
    wx.switchTab({
      url: '/pages/my/index',
    })
  },

  openBook(event) {
    const bookId = event.currentTarget.dataset.bookId

    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${bookId}`,
    })
  },
})
