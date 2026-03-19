function createCatalogLibraryService(deps) {
  const {
    bookService,
    bookCopyService,
    favoriteService,
    loanService,
    reservationService,
    reviewService,
    searchService,
    getCurrentApp,
    extractPageContent,
    toSearchHistoryKeywords,
    isActiveLoan,
    isActiveReservation,
    mapReview,
  } = deps

  return {
    async getCatalog(params) {
      const keyword = String((params && params.keyword) || '').trim()
      const categoryId = Number((params && params.categoryId) || 0)
      const availableOnly = Boolean(params && params.availableOnly)
      const app = getCurrentApp()
      const isLoggedIn = Boolean(app && typeof app.isLoggedIn === 'function' && app.isLoggedIn())

      const [
        books,
        categories,
        suggestions,
        hotKeywords,
        historyResponse,
        favorites,
        activeLoans,
        reservations,
      ] = await Promise.all([
        bookService.getBooks({
          keyword: keyword || undefined,
          categoryId: categoryId > 0 ? categoryId : undefined,
          page: 0,
          size: 60,
        }),
        bookService.getCategories(),
        keyword ? searchService.getSuggestions(keyword, 8) : Promise.resolve([]),
        searchService.getHotKeywords(8).catch(() => []),
        isLoggedIn ? searchService.getMyHistory(0, 8).catch(() => ({ content: [] })) : Promise.resolve({ content: [] }),
        isLoggedIn ? favoriteService.getMyFavorites(0, 100).catch(() => []) : Promise.resolve([]),
        isLoggedIn ? loanService.getMyLoans().catch(() => []) : Promise.resolve([]),
        isLoggedIn ? reservationService.getMyReservations().catch(() => []) : Promise.resolve([]),
      ])

      const filteredBooks = availableOnly
        ? (books || []).filter((item) => Number(item.availableCount || 0) > 0)
        : (books || [])

      return {
        categories: categories || [],
        suggestions: suggestions || [],
        hotKeywords: hotKeywords || [],
        searchHistory: toSearchHistoryKeywords(historyResponse),
        books: filteredBooks,
        favoriteBookIds: (favorites || []).map((item) => item.bookId),
        loanBookIds: (activeLoans || []).filter(isActiveLoan).map((item) => item.bookId),
        reservationBookIds: (reservations || []).filter(isActiveReservation).map((item) => item.bookId),
      }
    },

    async getBookDetail(bookId) {
      const numericBookId = Number(bookId)
      const app = getCurrentApp()
      const isLoggedIn = Boolean(app && typeof app.isLoggedIn === 'function' && app.isLoggedIn())
      const [
        book,
        copies,
        reviewsResponse,
        isFavorite,
        loans,
        reservations,
      ] = await Promise.all([
        bookService.getBookById(numericBookId),
        bookCopyService.getByBookId(numericBookId).catch(() => []),
        reviewService.getBookReviews(numericBookId, 0, 50).catch(() => ({ content: [] })),
        isLoggedIn ? favoriteService.checkFavorite(numericBookId).catch(() => false) : Promise.resolve(false),
        isLoggedIn ? loanService.getMyLoans().catch(() => []) : Promise.resolve([]),
        isLoggedIn ? reservationService.getMyReservations().catch(() => []) : Promise.resolve([]),
      ])

      const activeLoan = (loans || []).find((item) => item.bookId === numericBookId && isActiveLoan(item)) || null
      const activeReservation = (reservations || []).find((item) => item.bookId === numericBookId && isActiveReservation(item)) || null

      return {
        book,
        reviews: extractPageContent(reviewsResponse).map(mapReview),
        isFavorite,
        availableLocations: (copies || [])
          .map((item) => item.locationCode)
          .filter(Boolean),
        activeLoan,
        activeReservation,
      }
    },

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

    async borrowBook(bookId) {
      const numericBookId = Number(bookId)
      const copies = await bookCopyService.getByBookId(numericBookId)
      const availableCopy = (copies || []).find((item) => item.status === 'AVAILABLE')

      if (!availableCopy) {
        throw new Error('当前没有可借副本，请尝试预约排队')
      }

      return loanService.createLoan(availableCopy.copyId || availableCopy.id)
    },

    reserveBook(bookId) {
      return reservationService.createReservation(Number(bookId))
    },

    submitReview(bookId, payload) {
      return reviewService.createReview({
        bookId: Number(bookId),
        rating: Number(payload.rating || 5),
        commentText: String(payload.commentText || '').trim(),
      })
    },

    async getShelf() {
      const [favorites, activeLoans, historyLoans] = await Promise.all([
        favoriteService.getMyFavorites(0, 100),
        loanService.getMyLoans(),
        loanService.getMyLoanHistory(),
      ])

      return {
        favorites: favorites || [],
        activeLoans: activeLoans || [],
        historyLoans: historyLoans || [],
      }
    },

    getLoanById(loanId) {
      return loanService.getLoanById(Number(loanId))
    },

    renewLoan(loanId) {
      return loanService.renewLoan(Number(loanId))
    },

    returnLoan(loanId) {
      return loanService.returnLoan(Number(loanId))
    },

    getReservations() {
      return reservationService.getMyReservations()
    },

    cancelReservation(reservationId) {
      return reservationService.cancelReservation(Number(reservationId))
    },

    async getSearchHistory(page, size) {
      const response = await searchService.getMyHistory(page || 0, size || 50)
      return {
        ...response,
        content: extractPageContent(response),
      }
    },

    getHotKeywords(limit) {
      return searchService.getHotKeywords(limit || 8)
    },

    async getMyReviews(page, size) {
      const response = await reviewService.getMyReviews(page || 0, size || 20)
      return {
        ...response,
        content: extractPageContent(response).map(mapReview),
      }
    },

    updateReview(reviewId, payload) {
      return reviewService.updateReview(Number(reviewId), {
        bookId: Number(payload.bookId),
        rating: Number(payload.rating || 0),
        commentText: payload.commentText ? String(payload.commentText).trim() : '',
      })
    },

    deleteReview(reviewId) {
      return reviewService.deleteReview(Number(reviewId))
    },
  }
}

module.exports = {
  createCatalogLibraryService,
}
