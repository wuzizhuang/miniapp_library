/**
 * @file 后端 API 数据传输对象（DTO）类型定义
 * @description 定义与后端 Spring Boot API 通信的所有请求/响应数据结构。
 *   这些类型与后端 Java DTO 一一对应，是前后端契约的核心。
 *
 *   组织结构：
 *   1. 通用结构（分页响应、错误响应）
 *   2. 认证相关（登录、注册、密码重置、令牌刷新）
 *   3. 图书目录（图书、作者、分类、副本）
 *   4. 搜索（搜索日志）
 *   5. 用户（资料、概览）
 *   6. 借阅（借阅记录）
 *   7. 预约（图书预约）
 *   8. 通知
 *   9. 罚款
 *   10. 反馈
 *   11. 服务预约
 *   12. 座位预约
 *   13. 评论
 *   14. 推荐动态
 *   15. 首页聚合
 */

// ─── 1. 通用结构 ─────────────────────────────────

/** Spring Data 分页响应包装 */
export interface PageResponse<T> {
  content: T[];              // 当前页数据
  totalPages: number;        // 总页数
  totalElements: number;     // 总数据量
  size: number;              // 每页大小
  number: number;            // 当前页码（0-indexed）
  first: boolean;            // 是否首页
  last: boolean;             // 是否末页
  empty: boolean;            // 是否为空
}

/** API 错误响应 */
export interface ApiErrorResponse {
  status: number;            // HTTP 状态码
  error: string;             // 错误类型
  message: string;           // 错误描述
  path?: string | null;      // 请求路径
  code?: string;             // 业务错误码
  validationErrors?: Record<string, string>;  // 字段级校验错误
}

// ─── 2. 认证相关 ─────────────────────────────────

/** 登录请求 */
export interface ApiLoginRequest {
  username: string;
  password: string;
}

/** 注册请求 */
export interface ApiRegisterRequest {
  username: string;
  password: string;
  confirmPassword?: string;
  email: string;
  fullName: string;
}

/** 忘记密码请求 */
export interface ApiForgotPasswordRequest {
  email: string;
}

/** 忘记密码响应 */
export interface ApiForgotPasswordResponse {
  message: string;
}

/** 重置密码请求 */
export interface ApiResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword?: string;
}

/** 重置密码令牌校验响应 */
export interface ApiResetPasswordValidateResponse {
  valid: boolean;
  message?: string;
}

/** 登录/刷新令牌响应 */
export interface ApiAuthResponse {
  token: string;                    // 访问令牌
  tokenType: string;                // 令牌类型（Bearer）
  refreshToken?: string;            // 刷新令牌
  refreshTokenExpiresAt?: string;   // 刷新令牌过期时间
  userId: number;
  username: string;
  role: string;
  roles?: string[];
  permissions?: string[];
}

/** 刷新令牌请求 */
export interface ApiRefreshTokenRequest {
  refreshToken: string;
}

/** 认证上下文（角色 & 权限） */
export interface ApiAuthContextDto {
  userId: number;
  username: string;
  email?: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

// ─── 3. 图书目录 ─────────────────────────────────

/** 作者 DTO */
export interface ApiAuthorDto {
  authorId: number;
  name: string;
  biography?: string;
}

/** 分类 DTO */
export interface ApiCategoryDto {
  categoryId: number;
  name: string;
}

/** 图书 DTO（核心实体） */
export interface ApiBookDto {
  bookId: number;
  title: string;
  isbn: string;
  coverUrl?: string;
  resourceMode?: "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "HYBRID";
  onlineAccessUrl?: string;
  onlineAccessType?: "OPEN_ACCESS" | "CAMPUS_ONLY" | "LICENSED_ACCESS";
  description?: string;
  pageCount?: number;
  publishedYear?: number;
  language?: string;
  publisherId?: number;
  publisherName?: string;
  categoryId?: number;
  categoryName?: string;
  authors?: ApiAuthorDto[];
  availableCopies?: number;
  totalCopies?: number;
  pendingReservationCount?: number;
  avgRating?: number;
  reviewCount?: number;
}

/** 图书副本 DTO */
export interface ApiBookCopyDto {
  id: number;
  bookId: number;
  bookTitle: string;
  isbn: string;
  status: "AVAILABLE" | "BORROWED" | "RESERVED" | "LOST" | "DAMAGED";
  acquisitionDate: string;
  price: number;
  notes?: string;
  locationCode?: string;
}

// ─── 4. 搜索 ─────────────────────────────────

/** 搜索日志 DTO */
export interface ApiSearchLogDto {
  searchId: number;
  keyword: string;
  resultCount?: number;
  searchTime: string;
}

// ─── 5. 用户 ─────────────────────────────────

/** 用户资料 DTO */
export interface ApiUserProfileDto {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "USER" | string;
  roles?: string[];
  status: string;
  department?: string;           // 院系
  major?: string;                // 专业
  identityType?: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";  // 身份类型
  enrollmentYear?: number;       // 入学年份
  interestTags?: string[];       // 兴趣标签
  createTime?: string;
  updateTime?: string;
}

/** 用户资料更新 DTO */
export interface ApiProfileUpdateDto {
  fullName?: string;
  email?: string;
  department?: string;
  major?: string;
  enrollmentYear?: number;
  interestTags?: string[];
}

/** 用户概览借阅摘要 DTO */
export interface ApiUserOverviewLoanDto {
  loanId: number;
  bookId: number;
  bookTitle: string;
  dueDate: string;
  daysRemaining: number;
  status: string;
}

/** 用户概览统计 DTO */
export interface ApiUserOverviewDto {
  userId: number;
  username: string;
  fullName?: string;
  activeLoanCount: number;
  dueSoonLoanCount: number;
  dueSoonLoans: ApiUserOverviewLoanDto[];
  activeReservationCount: number;
  readyReservationCount: number;
  pendingFineCount: number;
  pendingFineTotal: number;
  unreadNotificationCount: number;
  favoriteCount: number;
  pendingServiceAppointmentCount: number;
  completedServiceAppointmentCount: number;
}

// ─── 6. 借阅 ─────────────────────────────────

/** 借阅记录 DTO */
export interface ApiLoanDto {
  loanId: number;
  copyId: number;
  bookId?: number;
  bookTitle: string;
  bookIsbn?: string;
  bookCoverUrl?: string;
  bookAuthorNames?: string;
  categoryName?: string;
  locationCode?: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: "ACTIVE" | "OVERDUE" | "RETURNED" | "LOST";
  daysOverdue?: number;
  daysRemaining?: number;
  renewalCount?: number;
}

// ─── 7. 预约 ─────────────────────────────────

/** 图书预约 DTO */
export interface ApiReservationDto {
  reservationId: number;
  bookId: number;
  bookTitle: string;
  bookIsbn?: string;
  coverUrl?: string;
  status: "PENDING" | "AWAITING_PICKUP" | "FULFILLED" | "CANCELLED" | "EXPIRED";
  queuePosition?: number;
  reservationDate: string;
  expiryDate?: string;
}

// ─── 8. 通知 ─────────────────────────────────

/** 通知类型枚举 */
export type ApiNotificationType =
  | "DUE_REMINDER"         // 到期提醒
  | "ARRIVAL_NOTICE"       // 到馆通知
  | "NEW_BOOK_RECOMMEND"   // 新书推荐
  | "SYSTEM";              // 系统通知

/** 通知 DTO */
export interface ApiNotificationDto {
  notificationId: number;
  title: string;
  content: string;
  type: ApiNotificationType;
  isRead: boolean;
  sendTime: string;
  relatedEntityId?: number;
  targetType?: string;         // 目标实体类型（BOOK / LOAN / RESERVATION 等）
  targetId?: string;           // 目标实体 ID
  routeHint?: string;          // 路由提示路径
  businessKey?: string;        // 业务键
}

// ─── 9. 罚款 ─────────────────────────────────

/** 罚款 DTO */
export interface ApiFineDto {
  fineId: number;
  loanId?: number;
  bookTitle?: string;
  amount: number;
  status: "PENDING" | "PAID" | "WAIVED";
  type: "OVERDUE" | "LOST" | "DAMAGE";
  reason?: string;
  dateIssued: string;
  datePaid?: string;
}

// ─── 10. 反馈 ─────────────────────────────────

/** 反馈分类枚举 */
export type ApiFeedbackCategory =
  | "BOOK_INFO"              // 图书信息
  | "SYSTEM_BUG"             // 系统缺陷
  | "SERVICE_EXPERIENCE"     // 服务体验
  | "SUGGESTION"             // 功能建议
  | "OTHER";                 // 其他

/** 反馈状态枚举 */
export type ApiFeedbackStatus =
  | "SUBMITTED"              // 已提交
  | "IN_PROGRESS"            // 处理中
  | "RESOLVED"               // 已解决
  | "REJECTED";              // 已驳回

/** 反馈创建 DTO */
export interface ApiFeedbackCreateDto {
  category: ApiFeedbackCategory;
  subject: string;
  content: string;
  contactEmail?: string;
}

/** 反馈回复 DTO */
export interface ApiFeedbackReplyDto {
  status: ApiFeedbackStatus;
  adminReply: string;
}

/** 反馈 DTO */
export interface ApiFeedbackDto {
  feedbackId: number;
  category: ApiFeedbackCategory;
  subject: string;
  content: string;
  contactEmail?: string;
  status: ApiFeedbackStatus;
  adminReply?: string;
  handledBy?: string;
  createTime?: string;
  replyTime?: string;
}

// ─── 11. 服务预约 ─────────────────────────────────

/** 服务预约类型枚举 */
export type ApiServiceAppointmentType =
  | "RETURN_BOOK"            // 还书
  | "PICKUP_BOOK"            // 取书
  | "CONSULTATION";          // 咨询

/** 服务预约方式枚举 */
export type ApiServiceAppointmentMethod =
  | "COUNTER"                // 柜台
  | "SMART_LOCKER";          // 智能柜

/** 服务预约状态枚举 */
export type ApiServiceAppointmentStatus =
  | "PENDING"                // 待处理
  | "COMPLETED"              // 已完成
  | "CANCELLED"              // 已取消
  | "MISSED";                // 未到

/** 服务预约创建 DTO */
export interface ApiServiceAppointmentCreateDto {
  serviceType: ApiServiceAppointmentType;
  method: ApiServiceAppointmentMethod;
  scheduledTime: string;
  loanId?: number;
  returnLocation?: string;
  notes?: string;
}

/** 服务预约 DTO */
export interface ApiServiceAppointmentDto {
  appointmentId: number;
  userId: number;
  username: string;
  userFullName?: string;
  loanId?: number;
  bookTitle?: string;
  serviceType: ApiServiceAppointmentType;
  method: ApiServiceAppointmentMethod;
  status: ApiServiceAppointmentStatus;
  scheduledTime: string;
  returnLocation?: string;
  notes?: string;
  createTime: string;
  updateTime?: string;
}

// ─── 12. 座位预约 ─────────────────────────────────

/** 座位类型枚举 */
export type ApiSeatType = "STANDARD" | "COMPUTER" | "DISCUSSION";

/** 座位状态枚举 */
export type ApiSeatStatus = "AVAILABLE" | "UNAVAILABLE";

/** 座位 DTO */
export interface ApiSeatDto {
  seatId: number;
  seatCode: string;
  floorName: string;
  floorOrder?: number;
  zoneName?: string;
  areaName?: string;
  seatType: ApiSeatType;
  status: ApiSeatStatus;
  hasPower: boolean;
  nearWindow: boolean;
  description?: string;
  available?: boolean;         // 在指定时间段内是否可用
}

/** 座位预约创建 DTO */
export interface ApiSeatReservationCreateDto {
  seatId: number;
  startTime: string;
  endTime: string;
  notes?: string;
}

/** 座位预约状态枚举 */
export type ApiSeatReservationStatus =
  | "ACTIVE"                 // 有效
  | "CANCELLED"              // 已取消
  | "COMPLETED"              // 已完成
  | "MISSED";                // 未到

/** 座位预约 DTO */
export interface ApiSeatReservationDto {
  reservationId: number;
  userId: number;
  username: string;
  userFullName?: string;
  seatId: number;
  seatCode: string;
  floorName?: string;
  zoneName?: string;
  areaName?: string;
  seatType?: ApiSeatType;
  startTime: string;
  endTime: string;
  status: ApiSeatReservationStatus;
  notes?: string;
  createTime: string;
  updateTime?: string;
}

// ─── 13. 评论 ─────────────────────────────────

/** 评论创建 DTO */
export interface ApiReviewCreateDto {
  bookId: number;
  rating: number;              // 评分（1-5）
  commentText?: string;        // 评论内容
}

/** 评论 DTO */
export interface ApiReviewDto {
  reviewId: number | string;
  userId?: number;
  bookId: number;
  username: string;
  userFullName?: string;
  userAvatar?: string;
  bookTitle?: string;
  bookIsbn?: string;
  rating: number;
  commentText?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";  // 审核状态
  createTime?: string;
  auditTime?: string;
}

// ─── 14. 推荐动态 ─────────────────────────────────

/** 推荐动态范围枚举 */
export type ApiRecommendationScope = "all" | "following" | "mine";

/** 推荐动态创建 DTO */
export interface ApiRecommendationCreateDto {
  bookId: number;
  content: string;
}

/** 推荐动态 DTO */
export interface ApiRecommendationPostDto {
  postId: number;
  authorUserId: number;
  authorUsername: string;
  authorFullName: string;
  authorIdentityType?: string;
  authorDepartment?: string;
  bookId: number;
  bookTitle: string;
  bookIsbn: string;
  bookCoverUrl?: string;
  content: string;
  createTime: string;
  likeCount?: number;
  likedByMe?: boolean;
  followingAuthor?: boolean;
  canManage?: boolean;
}

// ─── 15. 首页聚合 ─────────────────────────────────

/** 首页统计项 */
export interface ApiHomeStat {
  label: string;               // 统计标签
  value: number;               // 统计值
}

/** 首页图书推荐项 */
export interface ApiHomeBookItem {
  id: number;
  title: string;
  author: string;
  cover?: string;
  tag?: string;                // 角标文字（如"新上架"）
}

/** 首页分类统计项 */
export interface ApiHomeCategoryItem {
  categoryId: number;
  label: string;
  count: number;
}

/** 首页聚合数据 */
export interface ApiHomePageDto {
  heroStats: ApiHomeStat[];              // 顶部统计数据
  featuredBooks: ApiHomeBookItem[];      // 精选推荐
  newArrivals: ApiHomeBookItem[];        // 新上架
  categories: ApiHomeCategoryItem[];     // 分类概览
}
