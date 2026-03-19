const { libraryService } = require('../../services/library')
const { searchService } = require('../../services/search')

const SUGGESTION_DEBOUNCE_MS = 280
const PENDING_BOOK_KEYWORD_STORAGE_KEY = 'miniapp_pending_books_keyword'

function normalizeText(value) {
  return String(value || '').trim()
}

function buildCategoryName(categoryId, categories) {
  if (!Number(categoryId)) {
    return '全部分类'
  }

  const currentCategory = (categories || []).find(
    (item) => Number(item.categoryId) === Number(categoryId),
  )

  return currentCategory && currentCategory.name
    ? currentCategory.name
    : '当前分类'
}

function getUserBookState(book, catalog) {
  const favoriteBookIds = catalog.favoriteBookIds || []
  const loanBookIds = catalog.loanBookIds || []
  const reservationBookIds = catalog.reservationBookIds || []

  if (loanBookIds.includes(book.bookId)) {
    return 'loaned'
  }

  if (reservationBookIds.includes(book.bookId)) {
    return 'reserved'
  }

  if (favoriteBookIds.includes(book.bookId)) {
    return 'favorited'
  }

  if (Number(book.availableCount || 0) > 0) {
    return 'available'
  }

  return 'out_of_stock'
}

function getStatePresentation(userState) {
  if (userState === 'loaned') {
    return {
      statusLabel: '我在借',
      statusClass: 'chip-primary',
      actionLabel: '查看借阅',
      actionClass: 'catalog-action-chip catalog-action-chip--primary',
    }
  }

  if (userState === 'reserved') {
    return {
      statusLabel: '我已预约',
      statusClass: 'chip-danger',
      actionLabel: '查看预约',
      actionClass: 'catalog-action-chip catalog-action-chip--danger',
    }
  }

  if (userState === 'favorited') {
    return {
      statusLabel: '已收藏',
      statusClass: 'chip-primary',
      actionLabel: '查看详情',
      actionClass: 'catalog-action-chip',
    }
  }

  if (userState === 'available') {
    return {
      statusLabel: '可借阅',
      statusClass: 'chip-success',
      actionLabel: '借阅',
      actionClass: 'catalog-action-chip catalog-action-chip--success',
    }
  }

  return {
    statusLabel: '暂无库存',
    statusClass: 'chip-warning',
    actionLabel: '预约',
    actionClass: 'catalog-action-chip catalog-action-chip--warning',
  }
}

function decorateBook(book, catalog) {
  const availableCount = Number(book.availableCount || 0)
  const totalCopies = Number(
    book.totalCopies || book.inventoryCount || availableCount,
  )
  const userState = getUserBookState(book, catalog)
  const statePresentation = getStatePresentation(userState)
  const authorText = (book.authorNames || []).join(' / ')
  const summaryParts = [book.publisherName, book.publishYear].filter(Boolean)

  return {
    ...book,
    authorText: authorText || '作者信息待补充',
    summaryText: summaryParts.length
      ? summaryParts.join(' · ')
      : '出版信息待补充',
    categoryLabel: book.categoryName || '未分类',
    statusText:
      availableCount > 0
        ? `馆内可借 ${availableCount}/${totalCopies}`
        : '当前需预约排队',
    statusClass: availableCount > 0 ? 'chip-success' : 'chip-warning',
    statusHint:
      availableCount > 0
        ? '有空闲副本可直接发起借阅'
        : '当前没有空闲副本，可先加入预约队列',
    userState,
    userStateLabel: statePresentation.statusLabel,
    userStateClass: statePresentation.statusClass,
    actionLabel: statePresentation.actionLabel,
    actionClass: statePresentation.actionClass,
    reviewText:
      Number(book.reviewCount || 0) > 0
        ? `${book.reviewCount} 条评价`
        : '暂无评分',
    hasCover: Boolean(book.coverUrl),
  }
}

function buildActiveFilters(data, categories) {
  const labels = []
  const keyword = normalizeText(data.keyword)

  if (keyword) {
    labels.push(`关键词：${keyword}`)
  }

  if (Number(data.selectedCategoryId || 0) > 0) {
    labels.push(buildCategoryName(data.selectedCategoryId, categories))
  }

  if (data.availableOnly) {
    labels.push('仅看可借')
  }

  return labels
}

function buildCatalogSummary(books, data, categories) {
  const items = books || []

  return {
    totalCount: items.length,
    availableCount: items.filter(
      (item) => Number(item.availableCount || 0) > 0,
    ).length,
    selectedCategoryName: buildCategoryName(
      data.selectedCategoryId,
      categories,
    ),
    availabilityLabel: data.availableOnly ? '仅看可借' : '所有状态',
    keywordLabel: normalizeText(data.keyword) || '未输入关键词',
  }
}

function consumePendingBooksKeyword() {
  try {
    const pendingKeyword = wx.getStorageSync(PENDING_BOOK_KEYWORD_STORAGE_KEY)

    if (pendingKeyword) {
      wx.removeStorageSync(PENDING_BOOK_KEYWORD_STORAGE_KEY)
      return normalizeText(pendingKeyword)
    }
  } catch (error) {
    console.warn('consume pending books keyword failed', error)
  }

  return ''
}

Page({
  data: {
    searchInputValue: '',
    keyword: '',
    selectedCategoryId: 0,
    availableOnly: false,
    loading: true,
    errorMessage: '',
    catalog: {
      categories: [],
      suggestions: [],
      hotKeywords: [],
      searchHistory: [],
      books: [],
    },
    displaySuggestions: [],
    suggestionPreview: [],
    suggestionLoading: false,
    activeFilters: [],
    catalogSummary: {
      totalCount: 0,
      availableCount: 0,
      selectedCategoryName: '全部分类',
      availabilityLabel: '所有状态',
      keywordLabel: '未输入关键词',
    },
  },

  onLoad(options) {
    const keyword = normalizeText(options && options.keyword)
    const selectedCategoryId = Number((options && options.categoryId) || 0)
    const availableOnly = String((options && options.available) || '') === '1'

    this.setData({
      searchInputValue: keyword,
      keyword,
      selectedCategoryId,
      availableOnly,
    })
  },

  onShow() {
    const pendingKeyword = consumePendingBooksKeyword()

    if (pendingKeyword) {
      this.clearSuggestionTimer()
      this.setData(
        {
          searchInputValue: pendingKeyword,
          keyword: pendingKeyword,
          suggestionPreview: [],
          displaySuggestions: [],
        },
        () => this.loadCatalog(),
      )
      return
    }

    this.loadCatalog()
  },

  onHide() {
    this.clearSuggestionTimer()
  },

  onUnload() {
    this.clearSuggestionTimer()
  },

  onPullDownRefresh() {
    this.loadCatalog({ stopPullDownRefresh: true })
  },

  clearSuggestionTimer() {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer)
      this.suggestionTimer = null
    }
  },

  resolveDisplaySuggestions(preview, fallback, inputValue) {
    if (normalizeText(inputValue) && (preview || []).length) {
      return preview || []
    }

    return fallback || []
  },

  async loadCatalog(options) {
    const nextOptions = options || {}

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
      const books = (catalog.books || []).map((item) =>
        decorateBook(item, catalog),
      )

      this.setData({
        catalog: {
          ...catalog,
          books,
        },
        activeFilters: buildActiveFilters(this.data, catalog.categories || []),
        catalogSummary: buildCatalogSummary(
          books,
          this.data,
          catalog.categories || [],
        ),
        displaySuggestions: this.resolveDisplaySuggestions(
          this.data.suggestionPreview,
          catalog.suggestions || [],
          this.data.searchInputValue,
        ),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '目录加载失败',
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

  onKeywordInput(event) {
    const searchInputValue = event.detail.value

    this.setData({
      searchInputValue,
    })

    this.fetchSuggestionPreview(searchInputValue)
  },

  fetchSuggestionPreview(value) {
    const keyword = normalizeText(value)

    this.clearSuggestionTimer()

    if (!keyword) {
      this.setData({
        suggestionPreview: [],
        suggestionLoading: false,
        displaySuggestions: this.data.catalog
          ? this.data.catalog.suggestions || []
          : [],
      })
      return
    }

    this.setData({
      suggestionLoading: true,
    })

    this.suggestionTimer = setTimeout(async () => {
      try {
        const suggestions = await searchService.getSuggestions(keyword, 8)

        if (normalizeText(this.data.searchInputValue) !== keyword) {
          return
        }

        this.setData({
          suggestionPreview: suggestions || [],
          displaySuggestions: suggestions || [],
          suggestionLoading: false,
        })
      } catch (error) {
        if (normalizeText(this.data.searchInputValue) !== keyword) {
          return
        }

        this.setData({
          suggestionPreview: [],
          displaySuggestions: this.data.catalog
            ? this.data.catalog.suggestions || []
            : [],
          suggestionLoading: false,
        })
      }
    }, SUGGESTION_DEBOUNCE_MS)
  },

  runSearch() {
    this.clearSuggestionTimer()

    this.setData(
      {
        keyword: normalizeText(this.data.searchInputValue),
        displaySuggestions: [],
      },
      () => this.loadCatalog(),
    )
  },

  clearKeyword() {
    this.clearSuggestionTimer()

    this.setData(
      {
        searchInputValue: '',
        keyword: '',
        suggestionPreview: [],
        displaySuggestions: [],
      },
      () => this.loadCatalog(),
    )
  },

  clearAllFilters() {
    this.clearSuggestionTimer()

    this.setData(
      {
        searchInputValue: '',
        keyword: '',
        selectedCategoryId: 0,
        availableOnly: false,
        suggestionPreview: [],
        displaySuggestions: [],
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
    const nextCategoryId =
      this.data.selectedCategoryId === categoryId ? 0 : categoryId

    this.setData(
      {
        selectedCategoryId: nextCategoryId,
      },
      () => this.loadCatalog(),
    )
  },

  applyKeyword(event) {
    const keyword = event.currentTarget.dataset.keyword || ''

    this.clearSuggestionTimer()

    this.setData(
      {
        searchInputValue: keyword,
        keyword,
        suggestionPreview: [],
        displaySuggestions: [],
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

  retryLoadCatalog() {
    this.loadCatalog()
  },
})
