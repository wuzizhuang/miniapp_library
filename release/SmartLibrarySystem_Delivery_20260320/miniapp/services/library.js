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
const { seatReservationService } = require('./seatReservation')
const { serviceAppointmentService } = require('./serviceAppointment')
const { userService } = require('./user')
const { getStoredRefreshToken, getStoredToken } = require('../utils/storage')
const {
  getCurrentApp,
  mapProfileToSessionUser,
  buildSessionUserFromToken,
  extractPageContent,
  toSearchHistoryKeywords,
  isActiveReservation,
  isActiveLoan,
  mapReview,
  normalizeDateTimeInput,
} = require('./library/shared')
const { createSessionLibraryService } = require('./library/session')
const { createCatalogLibraryService } = require('./library/catalog')
const { createSupportLibraryService } = require('./library/support')
const { createAppointmentLibraryService } = require('./library/appointments')
const { createRecommendationLibraryService } = require('./library/recommendations')
const { wrapWithFallback } = require('./library-offline')

const _libraryService = {
  ...createSessionLibraryService({
    authService,
    publicService,
    userService,
    getStoredRefreshToken,
    getStoredToken,
  }),
  ...createCatalogLibraryService({
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
  }),
  ...createSupportLibraryService({
    fineService,
    notificationService,
    feedbackService,
    extractPageContent,
  }),
  ...createAppointmentLibraryService({
    loanService,
    seatReservationService,
    serviceAppointmentService,
    extractPageContent,
    isActiveLoan,
    normalizeDateTimeInput,
  }),
  ...createRecommendationLibraryService({
    bookService,
    recommendationService,
    extractPageContent,
  }),
}

const libraryService = wrapWithFallback(_libraryService)

module.exports = {
  libraryService,
  mapProfileToSessionUser,
  buildSessionUserFromToken: (token) => buildSessionUserFromToken(authService, token),
}
