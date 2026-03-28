/**
 * @file 服务模块统一导出
 * @description 将所有分散的服务模块集中导出，
 *   方便其他文件通过 require('./services') 一次性引入所需服务。
 *
 *   注意：页面代码通常不直接使用这些底层服务，
 *   而是通过 libraryService（聚合层）间接调用。
 *   此文件主要供应用入口和聚合层使用。
 */

// ─── 引入所有底层服务模块 ─────────────────────────────────────────
const { authService } = require('./auth')                             // 鉴权服务
const { publicService } = require('./public')                         // 公共数据服务
const { bookService } = require('./book')                             // 图书服务
const { searchService } = require('./search')                         // 搜索服务
const { bookCopyService } = require('./bookCopy')                     // 图书副本服务
const { favoriteService } = require('./favorite')                     // 收藏服务
const { loanService } = require('./loan')                             // 借阅服务
const { reservationService } = require('./reservation')               // 预约服务
const { notificationService, resolveNotificationTarget } = require('./notification')  // 通知服务
const { fineService } = require('./fine')                             // 罚款服务
const { feedbackService } = require('./feedback')                     // 反馈服务
const { serviceAppointmentService } = require('./serviceAppointment') // 服务预约
const { seatReservationService } = require('./seatReservation')       // 座位预约服务
const { reviewService } = require('./review')                         // 评价服务
const { recommendationService } = require('./recommendation')         // 推荐动态服务
const { userService } = require('./user')                             // 用户信息服务

// ─── 统一导出 ─────────────────────────────────────────────────────
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
  seatReservationService,
  reviewService,
  recommendationService,
  userService,
}
