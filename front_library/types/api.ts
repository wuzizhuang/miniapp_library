// =============================================================================
// FILE: frontend/types/api.ts
// DESCRIPTION: 后端接口的严格类型定义 (Strict Type Definitions matching Backend DTOs)
// =============================================================================

// --- 1. 通用枚举 (Enums based on Java Enums) ---

/**
 * 对应后端: com.example.library.model.Role
 */
export type ApiRole = "ADMIN" | "USER" | string;

/**
 * 对应后端: 图书状态枚举
 */
export type ApiBookStatus = "ACTIVE" | "INACTIVE";
export type ApiBookResourceMode = "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "HYBRID";
export type ApiOnlineAccessType = "OPEN_ACCESS" | "CAMPUS_ONLY" | "LICENSED_ACCESS";

/**
 * 对应后端: 借阅状态枚举
 */
export type ApiLoanStatus = "ACTIVE" | "OVERDUE" | "RETURNED" | "LOST";

// --- 2. 通用响应结构 (Generic Responses) ---

/**
 * Spring Data JPA Page<T> 的标准 JSON 响应结构
 */
export interface PageResponse<T> {
  content: T[]; // 数据列表
  totalPages: number; // 总页数
  totalElements: number; // 总记录数
  size: number; // 当前页大小
  number: number; // 当前页码 (0-based)
  first: boolean; // 是否第一页
  last: boolean; // 是否最后一页
  empty: boolean; // 是否为空
}

export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string | null;
  code?: string;
  retryAfterSeconds?: number;
  validationErrors?: Record<string, string>;
}

// --- 3. 认证相关 (Authentication) ---

/**
 * 对应后端: LoginRequest
 */
export interface ApiLoginRequest {
  username: string;
  password: string;
}

export interface ApiRegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

/**
 * 对应后端: JwtAuthenticationResponse
 */
export interface ApiAuthResponse {
  token: string;
  tokenType: string; // 通常为 "Bearer"
  userId: number; // 用户ID
  username: string;
  role: string;
  roles?: string[];
  permissions?: string[];
}

export interface ApiAuthContextDto {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface ApiForgotPasswordRequest {
  email: string;
}

export interface ApiForgotPasswordResponse {
  message: string;
  deliveryMethod: string;
  expiresInMinutes?: number | null;
}

export interface ApiResetPasswordValidateResponse {
  valid: boolean;
  message: string;
}

export interface ApiResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiUserOverviewLoanDto {
  loanId: number;
  bookId: number;
  bookTitle: string;
  dueDate: string;
  daysRemaining: number;
  status: string;
}

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

// --- 4. 用户相关 (User Context) ---

/**
 * 对应后端: User Entity / UserDto
 */
export interface ApiUserDto {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: ApiRole;
  status: string;
  roles?: string[];
  permissions?: string[];
  department?: string;
  major?: string;
  identityType?: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";
  enrollmentYear?: number;
  interestsTag?: string[];
  createTime?: string;
  updateTime?: string;
}

/**
 * 对应后端: UserProfileDto — 用户完整个人信息
 */
export interface ApiUserProfileDto {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: ApiRole;
  status: string;
  roles?: string[];
  permissions?: string[];
  department?: string;
  major?: string;
  identityType?: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";
  enrollmentYear?: number;
  interestTags?: string[];
  createTime?: string;
  updateTime?: string;
}

/**
 * 对应后端: ProfileUpdateDto — 用户自助更新个人信息请求
 */
export interface ApiProfileUpdateDto {
  fullName?: string;
  email?: string;
  department?: string;
  major?: string;
  enrollmentYear?: number;
  interestTags?: string[];
}

export interface ApiAuthorDto {
  authorId: number;
  name: string;
  biography?: string;
  birthYear?: number | null;
  deathYear?: number | null;
}

export interface ApiPublisherDto {
  publisherId: number;
  name: string;
  address?: string;
  contactInfo?: string;
}

export interface ApiCategoryDto {
  categoryId: number;
  name: string;
  parentId?: number | null;
  parentName?: string | null;
  description?: string;
}

// --- 5. 图书相关 (Book Context) ---

/**
 * 对应后端: com.example.library.dto.BookDetailDto
 * 注意：字段名严格对应 Java 类的字段
 */
export interface ApiBookDto {
  bookId: number;
  title: string;
  isbn: string;
  coverUrl?: string;
  resourceMode?: ApiBookResourceMode;
  onlineAccessUrl?: string;
  onlineAccessType?: ApiOnlineAccessType;
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
  avgRating?: number;
  reviewCount?: number;
}

/**
 * 创建/更新图书时的请求体
 * 对应后端: BookFormDto (假设存在用于 @RequestBody 的 DTO)
 */
export interface ApiBookRequest {
  title: string;
  isbn: string;
  coverUrl?: string;
  resourceMode?: ApiBookResourceMode;
  onlineAccessUrl?: string;
  onlineAccessType?: ApiOnlineAccessType;
  description?: string;
  pageCount?: number;
  publishedYear?: number;
  language?: string;
  publisherId: number;
  categoryId: number;
  authorIds: number[];
  copyCount?: number;
}

// --- 6. 借阅相关 (Loan Context) ---

/**
 * 对应后端: Loan Entity / LoanDto
 */
export interface ApiLoanDto {
  loanId: number;
  copyId: number;
  bookId: number;
  bookTitle: string;
  bookIsbn: string;
  bookCoverUrl?: string;
  bookAuthorNames?: string;
  categoryName?: string;
  locationCode?: string;
  userId: number;
  username: string;
  userFullName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: ApiLoanStatus;
  daysOverdue?: number;
  daysRemaining?: number;
  createTime?: string;
  updateTime?: string;
  renewalCount?: number;
}

// --- 7. 预约相关 (Reservation Context) ---

export type ApiReservationStatus =
  | "PENDING"
  | "AWAITING_PICKUP"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface ApiReservationDto {
  reservationId: number;
  bookId: number;
  bookTitle: string;
  bookIsbn?: string;
  coverUrl?: string;
  userId: number;
  username: string;
  userFullName?: string;
  status: ApiReservationStatus;
  queuePosition?: number; // 排队位置
  reservationDate: string;
  expiryDate?: string;
  createTime?: string;
  updateTime?: string;
}

// --- 8. 罚款相关 (Fine Context) ---

export type ApiFineStatus = "PENDING" | "PAID" | "WAIVED";
export type ApiFineType = "OVERDUE" | "LOST" | "DAMAGE";

export interface ApiFineDto {
  fineId: number;
  loanId?: number;
  bookTitle?: string;
  userId: number;
  username: string;
  userFullName?: string;
  amount: number;
  status: ApiFineStatus;
  type: ApiFineType;
  reason?: string;
  dateIssued: string;
  datePaid?: string;
}

// --- 9. 通知相关 (Notification Context) ---

export type ApiNotificationType =
  | "DUE_REMINDER"
  | "ARRIVAL_NOTICE"
  | "NEW_BOOK_RECOMMEND"
  | "SYSTEM";

export interface ApiNotificationDto {
  notificationId: number;
  title: string;
  content: string;
  type: ApiNotificationType;
  isRead: boolean;
  sendTime: string;
  relatedEntityId?: number; // 关联的借阅/预约 ID
  targetType?: string;
  targetId?: string;
  routeHint?: string;
  businessKey?: string;
}

// --- 10. 馆藏副本 (Book Copy Context) ---

export type ApiCopyStatus = "AVAILABLE" | "BORROWED" | "RESERVED" | "LOST" | "DAMAGED";

export interface ApiCopyDto {
  copyId: number;
  bookId: number;
  bookTitle?: string;
  locationCode: string;
  status: ApiCopyStatus;
  price?: number;
  acquisitionDate?: string;
  createTime?: string;
}

export interface ApiBookLocationMapLocationDto {
  copyId: number;
  locationCode: string;
  floorPlanId: number;
  floorOrder: number;
  floorName: string;
  zoneCode: string;
  zoneName: string;
  shelfCode: string;
  status: string;
  available: boolean;
}

export interface ApiBookLocationMapZoneDto {
  zoneCode: string;
  zoneName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  shelfCount: number;
  highlightedAvailableCopies: number;
}

export interface ApiBookLocationMapShelfDto {
  shelfCode: string;
  label: string;
  zoneCode: string;
  zoneName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  copyCount: number;
  availableCopyCount: number;
  highlighted: boolean;
  locationCodes: string[];
}

export interface ApiBookLocationMapFloorDto {
  floorPlanId: number;
  floorOrder: number;
  floorName: string;
  summary: string;
  mapWidth: number;
  mapHeight: number;
  highlightedAvailableCopies: number;
  zones: ApiBookLocationMapZoneDto[];
  shelves: ApiBookLocationMapShelfDto[];
}

export interface ApiBookLocationMapDto {
  bookId: number;
  bookTitle: string;
  generatedMode: string;
  totalCopies: number;
  availableCopies: number;
  highlightedFloorPlanId: number;
  locations: ApiBookLocationMapLocationDto[];
  floors: ApiBookLocationMapFloorDto[];
}

// --- 11. 评论 (Review Context) ---

export interface ApiReviewDto {
  reviewId: number;
  userId?: number;
  username: string;
  userFullName?: string;
  userAvatar?: string;
  bookId?: number;
  bookTitle?: string;
  bookIsbn?: string;
  rating: number;
  commentText?: string;
  status?: string;
  createTime: string;
  auditTime?: string;
}

export interface ApiReviewCreateDto {
  bookId: number;
  loanId?: number;
  rating: number;
  commentText?: string;
}

// --- 11.1 搜索与行为日志 (Search & Behavior) ---

export interface ApiSearchLogDto {
  searchId: number;
  keyword: string;
  resultCount?: number;
  searchTime: string;
}

export interface ApiBehaviorLogRequestDto {
  bookId: number;
  actionType:
    | "VIEW_DETAIL"
    | "ADD_TO_SHELF"
    | "CLICK_PREVIEW"
    | "SHARE"
    | "BORROW_BOOK"
    | "RESERVE_BOOK";
  durationSeconds?: number;
  deviceType?: string;
}

// --- 11.2 服务预约 (Service Appointment) ---

export type ApiServiceAppointmentType = "RETURN_BOOK" | "PICKUP_BOOK" | "CONSULTATION";
export type ApiServiceAppointmentMethod = "COUNTER" | "SMART_LOCKER";
export type ApiServiceAppointmentStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "MISSED";

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

export interface ApiServiceAppointmentCreateDto {
  serviceType: ApiServiceAppointmentType;
  scheduledTime: string;
  method?: ApiServiceAppointmentMethod;
  loanId?: number;
  returnLocation?: string;
  notes?: string;
}

export interface ApiServiceAppointmentStatusUpdateDto {
  status: ApiServiceAppointmentStatus;
}

// --- 11.25 座位预约 (Seat Reservation) ---

export type ApiSeatType = "STANDARD" | "COMPUTER" | "DISCUSSION";
export type ApiSeatStatus = "AVAILABLE" | "UNAVAILABLE";

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
  available?: boolean;
}

export interface ApiSeatReservationCreateDto {
  seatId: number;
  startTime: string;
  endTime: string;
  notes?: string;
}

export type ApiSeatReservationStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface ApiSeatReservationDto {
  reservationId: number;
  userId: number;
  username?: string;
  userFullName?: string;
  seatId: number;
  seatCode: string;
  floorName?: string;
  zoneName?: string;
  areaName?: string;
  seatType?: string;
  startTime: string;
  endTime: string;
  status: ApiSeatReservationStatus;
  notes?: string;
  createTime?: string;
  updateTime?: string;
}

// --- 11.3 推荐动态 (Recommendation Feed) ---

export type ApiRecommendationScope = "all" | "following" | "mine";

export interface ApiRecommendationCreateDto {
  bookId: number;
  content: string;
}

export interface ApiRecommendationPostDto {
  postId: number;
  authorUserId: number;
  authorUsername: string;
  authorFullName: string;
  authorIdentityType?: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";
  authorDepartment?: string;
  bookId: number;
  bookTitle: string;
  bookIsbn: string;
  bookCoverUrl?: string;
  content: string;
  createTime: string;
  likeCount: number;
  likedByMe: boolean;
  followingAuthor: boolean;
  canManage: boolean;
}

// --- 12. 反馈 (Feedback Context) ---

export type ApiFeedbackCategory =
  | "BOOK_INFO"
  | "SYSTEM_BUG"
  | "SERVICE_EXPERIENCE"
  | "SUGGESTION"
  | "OTHER";

export type ApiFeedbackStatus =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export interface ApiFeedbackDto {
  feedbackId: number;
  userId: number;
  username: string;
  category: ApiFeedbackCategory;
  subject: string;
  content: string;
  contactEmail?: string;
  status: ApiFeedbackStatus;
  adminReply?: string;
  handledBy?: string;
  replyTime?: string;
  createTime: string;
  updateTime?: string;
  messages?: ApiFeedbackMessageDto[];
}

export interface ApiFeedbackCreateDto {
  category: ApiFeedbackCategory;
  subject: string;
  content: string;
  contactEmail?: string;
}

export interface ApiFeedbackMessageDto {
  messageId?: number;
  senderType: "USER" | "ADMIN";
  senderUserId?: number;
  senderUsername?: string;
  senderName: string;
  content: string;
  createTime?: string;
}

export interface ApiFeedbackReplyDto {
  replyContent: string;
  status: ApiFeedbackStatus;
}

export interface ApiFeedbackFollowUpDto {
  content: string;
}

// --- 13. Public homepage ---

export interface ApiHomeStat {
  label: string;
  value: number;
}

export interface ApiHomeBookItem {
  id: number;
  title: string;
  author: string;
  cover?: string;
  tag?: string;
}

export interface ApiHomeCategoryItem {
  categoryId: number;
  label: string;
  count: number;
}

export interface ApiHomePageDto {
  heroStats: ApiHomeStat[];
  featuredBooks: ApiHomeBookItem[];
  newArrivals: ApiHomeBookItem[];
  categories: ApiHomeCategoryItem[];
}

export interface ApiChatMessageItem {
  role: "user" | "assistant";
  content: string;
}

export interface ApiPublicAiChatRequest {
  messages: ApiChatMessageItem[];
}

export interface ApiPublicAiChatResponse {
  reply: string;
  provider?: string;
  model?: string;
}

export interface ApiDashboardStatsDto {
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  availableCopies: number;
  pendingReservations: number;
  totalPendingFines: number;
}

export interface ApiDashboardTrendPointDto {
  date: string;
  borrowCount: number;
  returnCount: number;
}

export interface ApiDashboardBreakdownItemDto {
  key: string;
  label: string;
  value: number;
}

export interface ApiDashboardRecentLoanDto {
  loanId: number;
  bookTitle: string;
  bookCoverUrl?: string;
  userFullName: string;
  borrowDate: string;
  dueDate: string;
  status: string;
}

export interface ApiDashboardAnalyticsDto {
  summary: ApiDashboardStatsDto;
  loanTrend: ApiDashboardTrendPointDto[];
  reservationStatus: ApiDashboardBreakdownItemDto[];
  fineStatus: ApiDashboardBreakdownItemDto[];
  topKeywords: ApiDashboardBreakdownItemDto[];
  behaviorActions: ApiDashboardBreakdownItemDto[];
  recentLoans: ApiDashboardRecentLoanDto[];
}
