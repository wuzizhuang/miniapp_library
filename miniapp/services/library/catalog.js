/**
 * @file 图书馆服务 — 图书目录领域
 * @description 创建图书目录相关的 libraryService 方法：
 *   - getCatalog       — 获取完整目录数据（图书 + 分类 + 搜索 + 用户状态）
 *   - getBookDetail    — 获取图书详情（含评价、收藏、借阅、预约状态）
 *   - toggleFavorite   — 切换收藏状态
 *   - borrowBook       — 借书（自动查找可用副本）
 *   - reserveBook      — 预约排队
 *   - submitReview     — 提交评价
 *   - getShelf         — 获取"我的书架"数据
 *   - 借阅操作：getLoanById / renewLoan / returnLoan
 *   - 预约操作：getReservations / cancelReservation
 *   - 搜索历史 / 热门关键词 / 我的评价
 */

/**
 * 创建图书目录领域服务
 * @param {Object} deps - 依赖注入（各底层服务 + 工具函数）
 * @returns {Object} 目录相关方法集合
 */
function createCatalogLibraryService(deps) {
  const {
    bookService, bookCopyService, favoriteService, loanService,
    reservationService, reviewService, searchService,
    getCurrentApp, extractPageContent, toSearchHistoryKeywords,
    isActiveLoan, isActiveReservation, mapReview,
  } = deps

  return {
    /**
     * 获取图书目录页面所需的全部数据
     *
     * 并行请求 8 个数据源，组装为一个完整的目录视图模型：
     *   - books: 图书列表（支持搜索/分类/可借筛选）
     *   - categories: 分类列表
     *   - suggestions / hotKeywords / searchHistory: 搜索相关
     *   - favoriteBookIds / loanBookIds / reservationBookIds: 用户状态
     *
     * @param {Object} params - 筛选参数
     * @returns {Promise<Object>} 目录视图模型
     */
    async getCatalog(params) {
      const keyword = String((params && params.keyword) || '').trim()
      const categoryId = Number((params && params.categoryId) || 0)
      const availableOnly = Boolean(params && params.availableOnly)
      const page = Math.max(Number((params && params.page) || 0), 0)
      const size = Math.max(Number((params && params.size) || 10), 1)
      const app = getCurrentApp()
      const isLoggedIn = Boolean(app && typeof app.isLoggedIn === 'function' && app.isLoggedIn())

      // 并行请求所有数据源（登录用户额外请求收藏/借阅/预约）
      const [
        booksPage, categories, suggestions, hotKeywords,
        historyResponse, favorites, activeLoans, reservations,
      ] = await Promise.all([
        bookService.getBooksPage({
          keyword: keyword || undefined,
          categoryId: categoryId > 0 ? categoryId : undefined,
          availableOnly,
          page,
          size,
        }),
        bookService.getCategories(),
        keyword ? searchService.getSuggestions(keyword, 8) : Promise.resolve([]),
        searchService.getHotKeywords(8).catch(() => []),
        isLoggedIn ? searchService.getMyHistory(0, 8).catch(() => ({ content: [] })) : Promise.resolve({ content: [] }),
        isLoggedIn ? favoriteService.getMyFavorites(0, 100).catch(() => []) : Promise.resolve([]),
        isLoggedIn ? loanService.getMyLoans().catch(() => []) : Promise.resolve([]),
        isLoggedIn ? reservationService.getMyReservations().catch(() => []) : Promise.resolve([]),
      ])

      return {
        categories: categories || [],
        suggestions: suggestions || [],
        hotKeywords: hotKeywords || [],
        searchHistory: toSearchHistoryKeywords(historyResponse),
        books: booksPage.items || [],
        pagination: {
          page: booksPage.page || 0,
          size: booksPage.size || size,
          totalPages: booksPage.totalPages || 1,
          totalElements: booksPage.totalElements || 0,
          numberOfElements: booksPage.numberOfElements || 0,
          first: Boolean(booksPage.first),
          last: Boolean(booksPage.last),
        },
        favoriteBookIds: (favorites || []).map((item) => item.bookId),
        loanBookIds: (activeLoans || []).filter(isActiveLoan).map((item) => item.bookId),
        reservationBookIds: (reservations || []).filter(isActiveReservation).map((item) => item.bookId),
      }
    },

    /**
     * 获取图书详情页所需的全部数据
     * 并行请求图书信息、副本、评价、收藏状态、借阅和预约
     *
     * @param {number} bookId - 图书 ID
     * @returns {Promise<Object>} { book, reviews, isFavorite, availableLocations, activeLoan, activeReservation }
     */
    async getBookDetail(bookId) {
      const numericBookId = Number(bookId)
      const app = getCurrentApp()
      const isLoggedIn = Boolean(app && typeof app.isLoggedIn === 'function' && app.isLoggedIn())

      const [book, copies, reviewsResponse, isFavorite, loans, reservations] = await Promise.all([
        bookService.getBookById(numericBookId),
        bookCopyService.getByBookId(numericBookId).catch(() => []),
        reviewService.getBookReviews(numericBookId, 0, 50).catch(() => ({ content: [] })),
        isLoggedIn ? favoriteService.checkFavorite(numericBookId).catch(() => false) : Promise.resolve(false),
        isLoggedIn ? loanService.getMyLoans().catch(() => []) : Promise.resolve([]),
        isLoggedIn ? reservationService.getMyReservations().catch(() => []) : Promise.resolve([]),
      ])

      // 查找当前用户对该书的活跃借阅和预约
      const activeLoan = (loans || []).find((item) => item.bookId === numericBookId && isActiveLoan(item)) || null
      const activeReservation = (reservations || []).find((item) => item.bookId === numericBookId && isActiveReservation(item)) || null

      return {
        book,
        reviews: extractPageContent(reviewsResponse).map(mapReview),
        isFavorite,
        availableLocations: (copies || []).map((item) => item.locationCode).filter(Boolean),
        activeLoan,
        activeReservation,
      }
    },

    /**
     * 切换收藏状态（已收藏 → 取消，未收藏 → 添加）
     * @returns {Promise<boolean>} 操作后的收藏状态
     */
    async toggleFavorite(bookId) {
      const numericBookId = Number(bookId)
      const isFavorite = await favoriteService.checkFavorite(numericBookId)
      if (isFavorite) {
        await favoriteService.removeFavorite(numericBookId)
        return false
      }
      await favoriteService.addFavorite(numericBookId)
      return true
    },

    /**
     * 借书：自动查找可用副本 → 创建借阅
     * @throws {Error} 无可借副本时抛出错误
     */
    async borrowBook(bookId) {
      const numericBookId = Number(bookId)
      const copies = await bookCopyService.getByBookId(numericBookId)
      const availableCopy = (copies || []).find((item) => item.status === 'AVAILABLE')
      if (!availableCopy) {
        throw new Error('当前没有可借副本，请尝试预约排队')
      }
      return loanService.createLoan(availableCopy.copyId || availableCopy.id)
    },

    /** 预约排队 */
    reserveBook(bookId) {
      return reservationService.createReservation(Number(bookId))
    },

    /** 提交图书评价 */
    submitReview(bookId, payload) {
      return reviewService.createReview({
        bookId: Number(bookId),
        rating: Number(payload.rating || 5),
        commentText: String(payload.commentText || '').trim(),
      })
    },

    /**
     * 获取"我的书架"数据
     * 并行拉取收藏、当前借阅、历史借阅
     */
    async getShelf() {
      const [favorites, activeLoans, historyLoans] = await Promise.all([
        favoriteService.getMyFavorites(0, 100),
        loanService.getMyLoans(),
        loanService.getMyLoanHistory(),
      ])
      return { favorites: favorites || [], activeLoans: activeLoans || [], historyLoans: historyLoans || [] }
    },

    /** 获取单笔借阅详情 */
    getLoanById(loanId) { return loanService.getLoanById(Number(loanId)) },
    /** 续借 */
    renewLoan(loanId) { return loanService.renewLoan(Number(loanId)) },
    /** 归还 */
    returnLoan(loanId) { return loanService.returnLoan(Number(loanId)) },
    /** 获取我的预约列表 */
    getReservations() { return reservationService.getMyReservations() },
    /** 取消预约 */
    cancelReservation(reservationId) { return reservationService.cancelReservation(Number(reservationId)) },

    /** 获取搜索历史 */
    async getSearchHistory(page, size) {
      const response = await searchService.getMyHistory(page || 0, size || 50)
      return { ...response, content: extractPageContent(response) }
    },

    /** 获取热门关键词 */
    getHotKeywords(limit) { return searchService.getHotKeywords(limit || 8) },

    /** 清空搜索历史 */
    clearSearchHistory() { return searchService.clearMyHistory() },

    /** 获取我的评价列表 */
    async getMyReviews(page, size) {
      const response = await reviewService.getMyReviews(page || 0, size || 20)
      return { ...response, content: extractPageContent(response).map(mapReview) }
    },

    /** 更新评价 */
    updateReview(reviewId, payload) {
      return reviewService.updateReview(Number(reviewId), {
        rating: Number(payload.rating || 0),
        commentText: payload.commentText ? String(payload.commentText).trim() : '',
      })
    },

    /** 删除评价 */
    deleteReview(reviewId) { return reviewService.deleteReview(Number(reviewId)) },
  }
}

module.exports = { createCatalogLibraryService }
