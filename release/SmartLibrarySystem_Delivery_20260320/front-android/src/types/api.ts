export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  path?: string | null;
  code?: string;
  validationErrors?: Record<string, string>;
}

export interface ApiLoginRequest {
  username: string;
  password: string;
}

export interface ApiRegisterRequest {
  username: string;
  password: string;
  confirmPassword?: string;
  email: string;
  fullName: string;
}

export interface ApiForgotPasswordRequest {
  email: string;
}

export interface ApiForgotPasswordResponse {
  message: string;
}

export interface ApiResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword?: string;
}

export interface ApiResetPasswordValidateResponse {
  valid: boolean;
  message?: string;
}

export interface ApiAuthResponse {
  token: string;
  tokenType: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  userId: number;
  username: string;
  role: string;
  roles?: string[];
  permissions?: string[];
}

export interface ApiRefreshTokenRequest {
  refreshToken: string;
}

export interface ApiAuthContextDto {
  userId: number;
  username: string;
  email?: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

export interface ApiAuthorDto {
  authorId: number;
  name: string;
  biography?: string;
}

export interface ApiCategoryDto {
  categoryId: number;
  name: string;
}

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

export interface ApiSearchLogDto {
  searchId: number;
  keyword: string;
  resultCount?: number;
  searchTime: string;
}

export interface ApiUserProfileDto {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "USER" | string;
  roles?: string[];
  status: string;
  department?: string;
  major?: string;
  identityType?: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";
  enrollmentYear?: number;
  interestTags?: string[];
  createTime?: string;
  updateTime?: string;
}

export interface ApiProfileUpdateDto {
  fullName?: string;
  email?: string;
  department?: string;
  major?: string;
  enrollmentYear?: number;
  interestTags?: string[];
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
  relatedEntityId?: number;
  targetType?: string;
  targetId?: string;
  routeHint?: string;
  businessKey?: string;
}

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

export interface ApiFeedbackCreateDto {
  category: ApiFeedbackCategory;
  subject: string;
  content: string;
  contactEmail?: string;
}

export interface ApiFeedbackReplyDto {
  status: ApiFeedbackStatus;
  adminReply: string;
}

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

export type ApiServiceAppointmentType =
  | "RETURN_BOOK"
  | "PICKUP_BOOK"
  | "CONSULTATION";

export type ApiServiceAppointmentMethod =
  | "COUNTER"
  | "SMART_LOCKER";

export type ApiServiceAppointmentStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED";

export interface ApiServiceAppointmentCreateDto {
  serviceType: ApiServiceAppointmentType;
  method: ApiServiceAppointmentMethod;
  scheduledTime: string;
  loanId?: number;
  returnLocation?: string;
  notes?: string;
}

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

export type ApiSeatReservationStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "COMPLETED"
  | "MISSED";

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

export interface ApiReviewCreateDto {
  bookId: number;
  rating: number;
  commentText?: string;
}

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
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createTime?: string;
  auditTime?: string;
}

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
