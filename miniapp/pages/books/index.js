/**
 * @file 图书目录页面逻辑
 * @description 小程序的核心页面之一（Tab 页），功能：
 *   - 搜索图书（关键词输入 + 联想建议 + 热门关键词 + 搜索历史）
 *   - 按分类筛选 / 仅看可借 / 清空筛选
 *   - 图书列表展示（含用户状态标签：在借/已预约/已收藏/可借/需预约）
 *   - 下拉刷新 / 跳转详情页
 *
 *   数据流：
 *     1. onShow → loadCatalog → libraryService.getCatalog(params)
 *     2. 返回的图书列表经 decorateBook() 装饰为视图模型
 *     3. 搜索建议通过防抖（280ms）异步请求
 */

// 引入图书馆聚合服务和搜索服务
const { libraryService } = require('../../services/library')
const { searchService } = require('../../services/search')

/** 搜索建议请求的防抖延时（毫秒） */
const SUGGESTION_DEBOUNCE_MS = 280

/** 跨页面传递搜索关键词的本地存储键名（搜索历史页 → 目录页） */
const PENDING_BOOK_KEYWORD_STORAGE_KEY = 'miniapp_pending_books_keyword'

/** 馆藏目录每页条数 */
const CATALOG_PAGE_SIZE = 10

/**
 * 标准化文本输入（去除首尾空白）
 * @param {*} value - 原始值
 * @returns {string} 去空白后的字符串
 */
function normalizeText(value) {
  return String(value || '').trim()
}

/**
 * 根据分类 ID 获取分类显示名称
 * @param {number} categoryId - 分类 ID（0 或空表示全部）
 * @param {Object[]} categories - 分类列表
 * @returns {string} 分类名称
 */
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

/**
 * 判断当前用户对某本图书的状态
 * 优先级: loaned > reserved > favorited > available > out_of_stock
 */
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

/** 根据用户状态返回 UI 表现配置(标签文案/样式/操作按钮) */
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

/** 装饰图书对象, 为模板渲染补充展示字段(作者/出版/状态/用户状态等) */
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

/** 构建当前激活的筛选条件标签列表(关键词/分类/仅看可借) */
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

/** 构建目录摘要信息(总数/可借数/分类名等) */
function buildCatalogSummary(books, data, categories, pagination) {
  const items = books || []

  return {
    totalCount: Number((pagination && pagination.totalElements) || items.length),
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

/** 消费跨页面传递的待搜索关键词(搜索历史页写入, 目录页读取并清除) */
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
    currentPage: 1,
    pageCount: 1,
    pageSize: CATALOG_PAGE_SIZE,
    catalog: {
      categories: [],
      suggestions: [],
      hotKeywords: [],
      searchHistory: [],
      books: [],
      pagination: {
        page: 0,
        size: CATALOG_PAGE_SIZE,
        totalPages: 1,
        totalElements: 0,
        numberOfElements: 0,
        first: true,
        last: true,
      },
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

  /** 页面加载, 从 URL 参数解析初始筛选条件 */
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

  /** 页面显示时触发, 优先检查跨页面关键词 */
  onShow() {
    const pendingKeyword = consumePendingBooksKeyword()

    if (pendingKeyword) {
      this.clearSuggestionTimer()
      this.setData(
        {
          searchInputValue: pendingKeyword,
          keyword: pendingKeyword,
          currentPage: 1,
          suggestionPreview: [],
          displaySuggestions: [],
        },
        () => this.loadCatalog({ page: 1 }),
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

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadCatalog({ stopPullDownRefresh: true })
  },

  /** 上拉触底自动翻页 */
  onReachBottom() {
    if (this.data.loading || this.data.currentPage >= this.data.pageCount) {
      return
    }

    this.loadCatalog({
      page: this.data.currentPage + 1,
    })
  },

  /** 清除搜索建议的防抖定时器 */
  clearSuggestionTimer() {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer)
      this.suggestionTimer = null
    }
  },

  /** 决定当前展示哪组搜索建议: 输入中用实时预览, 否则用服务端返回的 */
  resolveDisplaySuggestions(preview, fallback, inputValue) {
    if (normalizeText(inputValue) && (preview || []).length) {
      return preview || []
    }

    return fallback || []
  },

  /** 加载图书目录数据(图书+分类+搜索建议+用户状态) */
  async loadCatalog(options) {
    const nextOptions = options || {}
    const requestedPage = Math.max(
      Number(nextOptions.page || this.data.currentPage || 1),
      1,
    )

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const catalog = await libraryService.getCatalog({
        keyword: this.data.keyword,
        categoryId: this.data.selectedCategoryId || '',
        availableOnly: this.data.availableOnly,
        page: requestedPage - 1,
        size: this.data.pageSize,
      })
      const books = (catalog.books || []).map((item) =>
        decorateBook(item, catalog),
      )
      const pagination = catalog.pagination || {}
      const currentPage = Number(pagination.page || 0) + 1
      const pageCount = Math.max(1, Number(pagination.totalPages || 0) || 1)

      this.setData({
        catalog: {
          ...catalog,
          books,
          pagination: {
            ...pagination,
            totalPages: pageCount,
          },
        },
        currentPage,
        pageCount,
        activeFilters: buildActiveFilters(this.data, catalog.categories || []),
        catalogSummary: buildCatalogSummary(
          books,
          this.data,
          catalog.categories || [],
          pagination,
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

  /** 搜索框输入事件, 同时触发防抖获取联想建议 */
  onKeywordInput(event) {
    const searchInputValue = event.detail.value

    this.setData({
      searchInputValue,
    })

    this.fetchSuggestionPreview(searchInputValue)
  },

  /** 防抖获取搜索联想建议(280ms 延迟, 且校验输入是否已变化) */
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

  /** 确认搜索: 将输入值生效为关键词并重新加载 */
  runSearch() {
    this.clearSuggestionTimer()

    this.setData(
      {
        keyword: normalizeText(this.data.searchInputValue),
        currentPage: 1,
        displaySuggestions: [],
      },
      () => this.loadCatalog({ page: 1 }),
    )
  },

  /** 清空关键词并重新加载 */
  clearKeyword() {
    this.clearSuggestionTimer()

    this.setData(
      {
        searchInputValue: '',
        keyword: '',
        currentPage: 1,
        suggestionPreview: [],
        displaySuggestions: [],
      },
      () => this.loadCatalog({ page: 1 }),
    )
  },

  /** 清空所有筛选条件(关键词 + 分类 + 仅看可借) */
  clearAllFilters() {
    this.clearSuggestionTimer()

    this.setData(
      {
        searchInputValue: '',
        keyword: '',
        currentPage: 1,
        selectedCategoryId: 0,
        availableOnly: false,
        suggestionPreview: [],
        displaySuggestions: [],
      },
      () => this.loadCatalog({ page: 1 }),
    )
  },

  /** 切换"仅看可借"筛选 */
  toggleAvailableOnly() {
    this.setData(
      {
        currentPage: 1,
        availableOnly: !this.data.availableOnly,
      },
      () => this.loadCatalog({ page: 1 }),
    )
  },

  /** 选择分类(再次点击同一分类则取消选择) */
  pickCategory(event) {
    const categoryId = Number(event.currentTarget.dataset.categoryId || 0)
    const nextCategoryId =
      this.data.selectedCategoryId === categoryId ? 0 : categoryId

    this.setData(
      {
        currentPage: 1,
        selectedCategoryId: nextCategoryId,
      },
      () => this.loadCatalog({ page: 1 }),
    )
  },

  /** 点击搜索建议或热门关键词, 直接应用该关键词 */
  applyKeyword(event) {
    const keyword = event.currentTarget.dataset.keyword || ''

    this.clearSuggestionTimer()

    this.setData(
      {
        searchInputValue: keyword,
        keyword,
        currentPage: 1,
        suggestionPreview: [],
        displaySuggestions: [],
      },
      () => this.loadCatalog({ page: 1 }),
    )
  },

  /** 点击图书卡片, 跳转到图书详情页 */
  openDetail(event) {
    const bookId = event.currentTarget.dataset.bookId

    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${bookId}`,
    })
  },

  prevPage() {
    if (this.data.loading || this.data.currentPage <= 1) {
      return
    }

    this.loadCatalog({
      page: this.data.currentPage - 1,
    })
  },

  nextPage() {
    if (this.data.loading || this.data.currentPage >= this.data.pageCount) {
      return
    }

    this.loadCatalog({
      page: this.data.currentPage + 1,
    })
  },

  retryLoadCatalog() {
    this.loadCatalog()
  },
})
