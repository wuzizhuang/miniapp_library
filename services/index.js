const { authService } = require('./auth')
const { publicService } = require('./public')
const { bookService } = require('./book')
const { searchService } = require('./search')
const { bookCopyService } = require('./bookCopy')
const { favoriteService } = require('./favorite')
const { loanService } = require('./loan')
const { reservationService } = require('./reservation')
const { notificationService, resolveNotificationTarget } = require('./notification')
const { fineService } = require('./fine')
const { feedbackService } = require('./feedback')
const { serviceAppointmentService } = require('./serviceAppointment')
const { reviewService } = require('./review')
const { recommendationService } = require('./recommendation')
const { userService } = require('./user')

module.exports = {
  authService,
  publicService,
  bookService,
  searchService,
  bookCopyService,
  favoriteService,
  loanService,
  reservationService,
  notificationService,
  resolveNotificationTarget,
  fineService,
  feedbackService,
  serviceAppointmentService,
  reviewService,
  recommendationService,
  userService,
}
