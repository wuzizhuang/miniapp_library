/**
 * @file 图书馆服务聚合层
 * @description 这是小程序业务逻辑的核心枢纽。
 *   将所有底层服务模块（auth / book / loan / reservation 等）
 *   通过 5 个领域工厂函数组装为统一的 libraryService 对象：
 *
 *   1. SessionLibraryService   — 会话管理（登录/注册/引导/资料更新）
 *   2. CatalogLibraryService   — 图书目录（浏览/搜索/收藏/借阅/评价）
 *   3. SupportLibraryService   — 支持功能（罚款/通知/反馈）
 *   4. AppointmentLibraryService — 预约管理（服务预约/座位预约）
 *   5. RecommendationLibraryService — 推荐动态
 *
 *   最终通过 wrapWithFallback() 包装为离线降级版本。
 *   页面代码只需 require libraryService 即可使用所有功能。
 */

// ─── 引入底层服务模块 ───────────────────────────────────────────
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

// ─── 引入共享工具和领域工厂 ────────────────────────────────────
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

// ─── 组装 libraryService ────────────────────────────────────────

/**
 * 内部 libraryService（未包装离线降级）
 * 通过展开操作符合并 5 个领域服务的所有方法
 */
const _libraryService = {
  // 会话管理：login / register / bootstrapFromToken / updateProfile 等
  ...createSessionLibraryService({
    authService, publicService, userService,
    getStoredRefreshToken, getStoredToken,
  }),
  // 图书目录：getCatalog / getBookDetail / toggleFavorite / borrowBook 等
  ...createCatalogLibraryService({
    bookService, bookCopyService, favoriteService, loanService,
    reservationService, reviewService, searchService,
    getCurrentApp, extractPageContent, toSearchHistoryKeywords,
    isActiveLoan, isActiveReservation, mapReview,
  }),
  // 支持功能：getFines / getNotifications / submitFeedback 等
  ...createSupportLibraryService({
    fineService, notificationService, feedbackService, extractPageContent,
  }),
  // 预约管理：getAppointments / getSeats / createSeatReservation 等
  ...createAppointmentLibraryService({
    loanService, seatReservationService, serviceAppointmentService,
    extractPageContent, isActiveLoan, normalizeDateTimeInput,
  }),
  // 推荐动态：getRecommendations / toggleRecommendationLike 等
  ...createRecommendationLibraryService({
    bookService, recommendationService, extractPageContent,
  }),
}

/**
 * 最终导出的 libraryService（已包装离线降级代理）
 * 所有方法在网络不可达时会自动回退到模拟数据
 */
const libraryService = wrapWithFallback(_libraryService)

module.exports = {
  libraryService,                   // 页面使用的主服务对象
  mapProfileToSessionUser,          // 映射 profile → 会话用户对象
  buildSessionUserFromToken: (token) => buildSessionUserFromToken(authService, token),
}
