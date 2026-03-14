const { authService } = require('./auth')
const { publicService } = require('./public')
const { bookService } = require('./book')
const { bookCopyService } = require('./bookCopy')
const { favoriteService } = require('./favorite')
const { feedbackService } = require('./feedback')
const { fineService } = require('./fine')
const { loanService } = require('./loan')
const { notificationService } = require('./notification')
const { recommendationService } = require('./recommendation')
const { reservationService } = require('./reservation')
const { reviewService } = require('./review')
const { searchService } = require('./search')
const { serviceAppointmentService } = require('./serviceAppointment')
const { userService } = require('./user')

function getCurrentApp() {
  if (typeof getApp !== 'function') {
    return null
  }

  try {
    return getApp()
  } catch (error) {
    return null
  }
}

function normalizeRoles(primaryRole, roles) {
  const roleSet = new Set()

  if (primaryRole) {
    roleSet.add(String(primaryRole).toUpperCase())
  }

  ;(roles || []).forEach((role) => {
    if (role) {
      roleSet.add(String(role).toUpperCase())
    }
  })

  if (roleSet.size === 0) {
    roleSet.add('USER')
  }

  return Array.from(roleSet)
}

function mapProfileToSessionUser(profile, context) {
  if (!profile) {
    return null
  }

  return {
    userId: profile.userId,
    username: profile.username,
    email: profile.email,
    fullName: profile.fullName || profile.username,
    role: profile.role || (context && context.role) || 'USER',
    roles: normalizeRoles(profile.role || (context && context.role), context && context.roles),
    permissions: (context && context.permissions) || [],
    identityType: profile.identityType,
    department: profile.department,
    major: profile.major,
    enrollmentYear: profile.enrollmentYear,
    interestTags: Array.isArray(profile.interestTags) ? profile.interestTags : [],
  }
}

async function buildSessionUserFromToken(token) {
  const [contextResult, profileResult] = await Promise.allSettled([
    authService.getContext(token),
    authService.getMyProfile(token),
  ])

  if (profileResult.status !== 'fulfilled') {
    throw profileResult.reason
  }

  const context = contextResult.status === 'fulfilled' ? contextResult.value : null

  return mapProfileToSessionUser(profileResult.value, context)
}

function extractPageContent(response) {
  if (!response || typeof response !== 'object') {
    return []
  }

  if (Array.isArray(response.content)) {
    return response.content
  }

  if (Array.isArray(response.items)) {
    return response.items
  }

  return []
}

function toSearchHistoryKeywords(response) {
  return extractPageContent(response)
    .map((item) => item && item.keyword)
    .filter(Boolean)
    .filter((keyword, index, list) => list.indexOf(keyword) === index)
}

function isActiveReservation(item) {
  return Boolean(
    item &&
      (item.status === 'PENDING' || item.status === 'AWAITING_PICKUP'),
  )
}

function isActiveLoan(item) {
  return Boolean(
    item &&
      (item.status === 'ACTIVE' ||
        item.status === 'BORROWED' ||
        item.status === 'OVERDUE'),
  )
}

function mapReview(review) {
  return {
    reviewId: review.reviewId,
    userId: review.userId,
    username: review.username || review.userFullName || '匿名读者',
    userFullName: review.userFullName,
    bookId: review.bookId,
    bookTitle: review.bookTitle,
    bookIsbn: review.bookIsbn,
    rating: Number(review.rating || 0),
    commentText: review.commentText || '',
    status: review.status || 'PENDING',
    createTime: review.createTime,
  }
}

function normalizeDateTimeInput(value) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return normalized
  }

  if (normalized.includes('T')) {
    return normalized.length === 16 ? `${normalized}:00` : normalized
  }

  return normalized.length === 16
    ? `${normalized.replace(' ', 'T')}:00`
    : normalized.replace(' ', 'T')
}

async function getRecommendationById(postId) {
  const response = await recommendationService.getFeed('all', 0, 100)
  return extractPageContent(response).find((item) => item.postId === Number(postId)) || null
}

const libraryService = {
  async login(payload) {
    const session = await authService.login(payload)
    const user = await buildSessionUserFromToken(session.token)

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    }
  },

  async bootstrapFromToken(token) {
    const user = await buildSessionUserFromToken(token)

    return {
      token,
      user,
    }
  },

  async register(payload) {
    await authService.register({
      username: payload.username,
      password: payload.password,
      fullName: payload.fullName,
      email: payload.email,
    })

    return this.login({
      username: payload.username,
      password: payload.password,
    })
  },

  requestPasswordReset(payload) {
    return authService.forgotPassword({
      email: payload.email,
    })
  },

  getHomePage() {
    return publicService.getHomePage()
  },

  getMyProfile() {
    return authService.getMyProfile()
  },

  async updateProfile(payload) {
    const profile = await authService.updateProfile({
      fullName: payload.fullName,
      department: payload.department,
      major: payload.major,
      enrollmentYear: Number.isFinite(payload.enrollmentYear) && payload.enrollmentYear > 0
        ? payload.enrollmentYear
        : undefined,
      interestTags: Array.isArray(payload.interestTags) ? payload.interestTags : [],
    })
    const app = getCurrentApp()
    const currentUser = app && typeof app.getCurrentUser === 'function' ? app.getCurrentUser() : null

    return mapProfileToSessionUser(profile, currentUser)
  },

  getMyOverview() {
    return userService.getMyOverview()
  },

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

  getFines() {
    return fineService.getMyFines()
  },

  payFine(fineId) {
    return fineService.payFine(Number(fineId))
  },

  async getNotifications() {
    const response = await notificationService.getNotificationsPage(0, 50)
    return extractPageContent(response)
  },

  markNotificationRead(notificationId) {
    return notificationService.markRead(Number(notificationId))
  },

  markAllNotificationsRead() {
    return notificationService.markAllRead()
  },

  deleteNotification(notificationId) {
    return notificationService.deleteNotification(Number(notificationId))
  },

  clearReadNotifications() {
    return notificationService.deleteAllRead()
  },

  async getFeedback() {
    const response = await feedbackService.getMyFeedback(0, 50)
    return extractPageContent(response)
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

  submitFeedback(payload) {
    return feedbackService.createFeedback({
      category: payload.category,
      subject: payload.subject,
      content: payload.content,
      contactEmail: payload.contactEmail,
    })
  },

  async getAppointments() {
    const response = await serviceAppointmentService.getMyAppointments(0, 50)
    return extractPageContent(response)
  },

  createAppointment(payload) {
    return serviceAppointmentService.createAppointment({
      serviceType: payload.serviceType,
      method: payload.method,
      scheduledTime: normalizeDateTimeInput(payload.scheduledTime),
      notes: payload.notes,
    })
  },

  cancelAppointment(appointmentId) {
    return serviceAppointmentService.cancelAppointment(Number(appointmentId))
  },

  async getRecommendations(scope) {
    const response = await recommendationService.getFeed(scope || 'all', 0, 50)
    return extractPageContent(response)
  },

  searchBooks(keyword) {
    return bookService.getBooks({
      keyword: String(keyword || '').trim(),
      page: 0,
      size: 6,
    })
  },

  createRecommendation(payload) {
    return recommendationService.createPost({
      bookId: Number(payload.bookId),
      content: String(payload.content || '').trim(),
    })
  },

  async toggleRecommendationLike(postId) {
    const post = await getRecommendationById(postId)

    if (!post) {
      throw new Error('推荐动态不存在')
    }

    if (post.likedByMe) {
      await recommendationService.unlikePost(post.postId)
      return false
    }

    await recommendationService.likePost(post.postId)
    return true
  },

  async toggleRecommendationFollow(postId) {
    const post = await getRecommendationById(postId)

    if (!post) {
      throw new Error('推荐动态不存在')
    }

    if (post.followingAuthor) {
      await recommendationService.unfollowTeacher(post.authorUserId)
      return false
    }

    await recommendationService.followTeacher(post.authorUserId)
    return true
  },

  deleteRecommendation(postId) {
    return recommendationService.deletePost(Number(postId))
  },
}

module.exports = {
  libraryService,
  mapProfileToSessionUser,
  buildSessionUserFromToken,
}
