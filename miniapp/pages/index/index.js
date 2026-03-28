/**
 * @file 首页页面逻辑
 * @description 小程序首页（Tab 页），展示馆藏速览、热门书单、推荐书单和分类概览。
 * 页面使用 onShow 生命周期加载数据，在每次切回首页时都会刷新。
 */

// 引入图书馆聚合服务
const { libraryService } = require('../../services/library')

function normalizeHomeBook(item, fallbackTag) {
  return {
    id: item.id || item.bookId || 0,
    title: item.title || '未命名图书',
    author: item.author || item.authorText || item.bookAuthor || '作者信息待补充',
    cover: item.cover || item.coverUrl || '',
    tag: item.tag || fallbackTag,
  }
}

function normalizeHomeData(rawHomeData) {
  const homeData = rawHomeData || {}
  const featuredBooks = (homeData.featuredBooks || homeData.hotBooks || []).map(
    (item) => normalizeHomeBook(item, '热门'),
  )

  let recommendedBooks = (
    homeData.recommendedBooks ||
    homeData.newArrivals ||
    []
  ).map((item) => normalizeHomeBook(item, '推荐'))

  if (!recommendedBooks.length) {
    recommendedBooks = featuredBooks.slice(0, 4).map((item) => ({
      ...item,
      tag: '推荐',
    }))
  }

  return {
    heroStats: homeData.heroStats || [],
    featuredBooks,
    recommendedBooks,
    categories: homeData.categories || [],
  }
}

Page({
  /**
   * 页面数据
   * @property {Object|null} homeData - 首页公共数据（热门图书等）
   * @property {boolean} loading      - 是否正在加载
   * @property {string} errorMessage  - 错误提示信息
   */
  data: {
    homeData: null,
    loading: true,
    errorMessage: '',
  },

  /**
   * 页面显示时触发
   * 添加 30 秒节流，避免 Tab 频繁切换时重复请求
   */
  onShow() {
    const now = Date.now()

    if (this._lastLoadTime && now - this._lastLoadTime < 30000) {
      return
    }

    this._lastLoadTime = now
    this.loadPageData()
  },

  /**
   * 加载首页数据
   *
   * 流程：
   *   1. 等待 App 初始化完成（app.whenReady）
   *   2. 请求首页公共数据
   */
  async loadPageData() {
    const app = getApp()

    // 等待 App 的 bootstrapSession 完成
    await app.whenReady()

    // 设置加载状态
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const homePageData = await libraryService.getHomePage()

      this.setData({
        homeData: normalizeHomeData(homePageData),
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
   * 跳转到图书目录页
   */
  goBooks() {
    wx.switchTab({
      url: '/pages/books/index',
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

  /** 重试加载首页 */
  retryLoadHomePage() {
    this.loadPageData()
  },
})
