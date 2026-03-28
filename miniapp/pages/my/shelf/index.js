/**
 * @file 我的书架页面逻辑
 * @description 展示用户个人书架，包含三个标签页：
 *   - 收藏（favorites）：已收藏的图书列表
 *   - 当前借阅（active）：正在借阅中的图书
 *   - 借阅历史（history）：已归还的借阅记录
 *
 *   支持客户端分页（每页 10 条）和下拉刷新
 */

const { libraryService } = require('../../../services/library')

/** 每页显示条数 */
const PAGE_SIZE = 10

/**
 * 装饰借阅列表项，补充状态标签和样式
 * @param {Object[]} items - 借阅记录列表
 * @returns {Object[]} 装饰后的列表
 */
function decorateLoans(items) {
  return (items || []).map((item) => ({
    ...item,
    statusLabel:
      item.status === 'BORROWED'
        ? '借阅中'
        : item.status === 'OVERDUE'
          ? '已逾期'
          : '已归还',
    statusClass:
      item.status === 'BORROWED'
        ? 'chip-warning'
        : item.status === 'OVERDUE'
          ? 'chip-danger'
          : 'chip-success',
    hasCover: Boolean(item.bookCover),
  }))
}

/**
 * 装饰收藏列表项，补充作者/分类/可用状态等展示字段
 * @param {Object[]} items - 收藏图书列表
 * @returns {Object[]} 装饰后的列表
 */
function decorateFavorites(items) {
  return (items || []).map((item) => ({
    ...item,
    authorText: (item.authorNames || []).join(' / ') || '作者信息待补充',
    categoryLabel: item.categoryName || '未分类',
    statusLabel: Number(item.availableCount || 0) > 0 ? '可借阅' : '需预约',
    statusClass:
      Number(item.availableCount || 0) > 0 ? 'chip-success' : 'chip-warning',
    hasCover: Boolean(item.coverUrl),
  }))
}

/**
 * 构建书架摘要统计
 * @param {Object} shelf - 书架数据
 * @returns {Object} { favoriteCount, activeLoanCount, overdueCount, historyCount }
 */
function buildShelfSummary(shelf) {
  const activeLoans = shelf.activeLoans || []
  const historyLoans = shelf.historyLoans || []

  return {
    favoriteCount: (shelf.favorites || []).length,
    activeLoanCount: activeLoans.length,
    overdueCount: activeLoans.filter((item) => item.status === 'OVERDUE').length,
    historyCount: historyLoans.length,
  }
}

Page({
  /**
   * 页面数据
   * @property {string} section      - 当前激活的标签页 (favorites/active/history)
   * @property {number} currentPage  - 当前页码（1-indexed）
   * @property {number} pageCount    - 总页数
   * @property {boolean} loading     - 加载中
   * @property {string} errorMessage - 错误信息
   * @property {Object} shelf        - 书架原始数据
   * @property {Object[]} visibleItems - 当前页显示的列表项
   * @property {Object} summary      - 书架摘要统计
   */
  data: {
    section: 'favorites',
    currentPage: 1,
    pageCount: 1,
    loading: true,
    errorMessage: '',
    shelf: {
      favorites: [],
      activeLoans: [],
      historyLoans: [],
    },
    visibleItems: [],
    summary: {
      favoriteCount: 0,
      activeLoanCount: 0,
      overdueCount: 0,
      historyCount: 0,
    },
  },

  /** 每次显示页面时加载书架数据 */
  onShow() {
    this.loadShelf()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadShelf({ stopPullDownRefresh: true })
  },

  /**
   * 加载书架数据
   * 并行获取收藏、当前借阅和借阅历史
   */
  async loadShelf(options) {
    const nextOptions = options || {}

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const shelf = await libraryService.getShelf()
      const nextShelf = {
        favorites: decorateFavorites(shelf.favorites),
        activeLoans: decorateLoans(shelf.activeLoans),
        historyLoans: decorateLoans(shelf.historyLoans),
      }

      this.setData({
        shelf: nextShelf,
        summary: buildShelfSummary(nextShelf),
        currentPage: 1,
      })
      this.updateVisibleItems()
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '书架加载失败',
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

  /** 切换标签页（收藏/当前借阅/历史） */
  pickSection(event) {
    this.setData({
      section: event.currentTarget.dataset.section,
      currentPage: 1,
    })
    this.updateVisibleItems()
  },

  /**
   * 更新当前页显示的列表项
   * 根据激活的标签页和当前页码进行客户端分页
   */
  updateVisibleItems() {
    const section = this.data.section
    const shelf = this.data.shelf
    let allItems = []

    if (section === 'favorites') {
      allItems = shelf.favorites || []
    } else if (section === 'active') {
      allItems = shelf.activeLoans || []
    } else {
      allItems = shelf.historyLoans || []
    }

    const page = this.data.currentPage
    const pageCount = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE))
    const start = (page - 1) * PAGE_SIZE
    const visibleItems = allItems.slice(start, start + PAGE_SIZE)

    this.setData({
      visibleItems,
      pageCount,
    })
  },

  /** 上一页 */
  prevPage() {
    if (this.data.currentPage <= 1) {
      return
    }
    this.setData({
      currentPage: this.data.currentPage - 1,
    })
    this.updateVisibleItems()
  },

  /** 下一页 */
  nextPage() {
    if (this.data.currentPage >= this.data.pageCount) {
      return
    }
    this.setData({
      currentPage: this.data.currentPage + 1,
    })
    this.updateVisibleItems()
  },

  /** 跳转到图书详情页 */
  openBook(event) {
    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${event.currentTarget.dataset.bookId}`,
    })
  },

  /** 跳转到借阅追踪页 */
  openLoan(event) {
    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${event.currentTarget.dataset.loanId}`,
    })
  },

  /** 跳转到图书目录 */
  goCatalog() {
    wx.switchTab({
      url: '/pages/index/index',
    })
  },

  /** 重试加载 */
  retryLoadShelf() {
    this.loadShelf()
  },
})
