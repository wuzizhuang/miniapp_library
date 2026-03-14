const { libraryService } = require('../../../services/library')

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
  data: {
    section: 'favorites',
    loading: true,
    errorMessage: '',
    shelf: {
      favorites: [],
      activeLoans: [],
      historyLoans: [],
    },
    summary: {
      favoriteCount: 0,
      activeLoanCount: 0,
      overdueCount: 0,
      historyCount: 0,
    },
  },

  onShow() {
    this.loadShelf()
  },

  onPullDownRefresh() {
    this.loadShelf({ stopPullDownRefresh: true })
  },

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
      })
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

  pickSection(event) {
    this.setData({
      section: event.currentTarget.dataset.section,
    })
  },

  openBook(event) {
    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${event.currentTarget.dataset.bookId}`,
    })
  },

  openLoan(event) {
    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${event.currentTarget.dataset.loanId}`,
    })
  },

  goCatalog() {
    wx.switchTab({
      url: '/pages/index/index',
    })
  },

  retryLoadShelf() {
    this.loadShelf()
  },
})
