const { libraryService } = require('../../services/library')

function decorateBook(book, catalog) {
  const favoriteBookIds = catalog.favoriteBookIds || []
  const loanBookIds = catalog.loanBookIds || []
  const reservationBookIds = catalog.reservationBookIds || []

  return {
    ...book,
    statusText: book.availableCount > 0 ? `可借 ${book.availableCount}/${book.totalCopies}` : '当前需预约',
    statusClass: book.availableCount > 0 ? 'chip-success' : 'chip-warning',
    isFavorite: favoriteBookIds.includes(book.bookId),
    isBorrowed: loanBookIds.includes(book.bookId),
    isReserved: reservationBookIds.includes(book.bookId),
    authorText: (book.authorNames || []).join(' / '),
  }
}

Page({
  data: {
    keyword: '',
    selectedCategoryId: 0,
    availableOnly: false,
    loading: true,
    errorMessage: '',
    catalog: null,
  },

  onShow() {
    this.loadCatalog()
  },

  async loadCatalog() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const catalog = await libraryService.getCatalog({
        keyword: this.data.keyword,
        categoryId: this.data.selectedCategoryId || '',
        availableOnly: this.data.availableOnly,
      })

      this.setData({
        catalog: {
          ...catalog,
          books: (catalog.books || []).map((item) => decorateBook(item, catalog)),
        },
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '目录加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  onKeywordInput(event) {
    this.setData({
      keyword: event.detail.value,
    })
  },

  runSearch() {
    this.loadCatalog()
  },

  clearKeyword() {
    this.setData(
      {
        keyword: '',
      },
      () => this.loadCatalog(),
    )
  },

  toggleAvailableOnly() {
    this.setData(
      {
        availableOnly: !this.data.availableOnly,
      },
      () => this.loadCatalog(),
    )
  },

  pickCategory(event) {
    const categoryId = Number(event.currentTarget.dataset.categoryId || 0)
    const nextCategoryId = this.data.selectedCategoryId === categoryId ? 0 : categoryId

    this.setData(
      {
        selectedCategoryId: nextCategoryId,
      },
      () => this.loadCatalog(),
    )
  },

  applyKeyword(event) {
    const keyword = event.currentTarget.dataset.keyword || ''

    this.setData(
      {
        keyword,
      },
      () => this.loadCatalog(),
    )
  },

  openDetail(event) {
    const bookId = event.currentTarget.dataset.bookId

    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${bookId}`,
    })
  },

  goMy() {
    wx.switchTab({
      url: '/pages/my/index',
    })
  },
})
