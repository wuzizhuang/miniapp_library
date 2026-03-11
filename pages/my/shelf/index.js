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
  }))
}

Page({
  data: {
    section: 'favorites',
    loading: true,
    errorMessage: '',
    shelf: null,
  },

  onShow() {
    this.loadShelf()
  },

  async loadShelf() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const shelf = await libraryService.getShelf()
      this.setData({
        shelf: {
          favorites: shelf.favorites || [],
          activeLoans: decorateLoans(shelf.activeLoans),
          historyLoans: decorateLoans(shelf.historyLoans),
        },
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '书架加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
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
})
