/**
 * @file 图书馆服务 — 共享工具函数
 * @description 提供跨领域复用的工具函数和数据映射逻辑：
 *   - 获取当前 App 实例
 *   - 角色标准化
 *   - Profile → 会话用户映射
 *   - 从 Token 构建会话用户
 *   - 分页响应内容提取
 *   - 搜索历史关键词提取
 *   - 借阅/预约状态判断
 *   - 评价数据映射
 *   - 日期时间格式标准化
 */

/**
 * 安全获取当前 App 实例
 * @returns {Object|null} App 实例，或 null
 */
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

/**
 * 将主角色和角色数组合并为去重的大写角色列表
 * @param {string} primaryRole - 主角色
 * @param {string[]} roles     - 附加角色数组
 * @returns {string[]} 标准化角色列表（至少含 'USER'）
 */
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

/**
 * 将后端 profile 和认证上下文合并映射为前端会话用户对象
 *
 * 组合了 profile（个人信息）和 context（权限信息）两个数据源
 *
 * @param {Object} profile - /users/me/profile 返回的数据
 * @param {Object} context - /auth/context 返回的数据
 * @returns {Object|null} 前端用户对象
 */
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
    identityType: profile.identityType,       // 身份类型（学生/教师/管理员）
    department: profile.department,            // 院系
    major: profile.major,                      // 专业
    enrollmentYear: profile.enrollmentYear,    // 入学年份
    interestTags: Array.isArray(profile.interestTags) ? profile.interestTags : [],  // 兴趣标签
  }
}

/**
 * 从 token 异步构建会话用户对象
 * 并行请求 context 和 profile，再合并映射
 *
 * @param {Object} authService - 鉴权服务实例
 * @param {string} token       - 访问令牌
 * @returns {Promise<Object>} 用户对象
 */
async function buildSessionUserFromToken(authService, token) {
  // 并行请求，任一失败不影响另一个
  const [contextResult, profileResult] = await Promise.allSettled([
    authService.getContext(token),
    authService.getMyProfile(token),
  ])

  // profile 是必须的，失败则抛出
  if (profileResult.status !== 'fulfilled') {
    throw profileResult.reason
  }

  // context 可选（失败时用 null 兜底）
  const context = contextResult.status === 'fulfilled' ? contextResult.value : null

  return mapProfileToSessionUser(profileResult.value, context)
}

/**
 * 从分页响应中提取内容数组
 * 兼容 { content: [] } 和 { items: [] } 两种后端格式
 *
 * @param {Object} response - 后端分页响应
 * @returns {Array} 内容数组
 */
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

/**
 * 从搜索历史分页响应中提取去重的关键词列表
 * @param {Object} response - 搜索历史分页响应
 * @returns {string[]} 去重后的关键词数组
 */
function toSearchHistoryKeywords(response) {
  return extractPageContent(response)
    .map((item) => item && item.keyword)
    .filter(Boolean)
    .filter((keyword, index, list) => list.indexOf(keyword) === index)  // 去重
}

/**
 * 判断预约是否为活跃状态（待处理或待取书）
 * @param {Object} item - 预约对象
 * @returns {boolean}
 */
function isActiveReservation(item) {
  return Boolean(
    item &&
      (item.status === 'PENDING' || item.status === 'AWAITING_PICKUP'),
  )
}

/**
 * 判断借阅是否为活跃状态（在借、已借出、逾期）
 * @param {Object} item - 借阅对象
 * @returns {boolean}
 */
function isActiveLoan(item) {
  return Boolean(
    item &&
      (item.status === 'ACTIVE' ||
        item.status === 'BORROWED' ||
        item.status === 'OVERDUE'),
  )
}

/**
 * 将后端评价 DTO 映射为前端评价对象
 * @param {Object} review - 后端评价数据
 * @returns {Object} 前端评价对象
 */
function mapReview(review) {
  return {
    reviewId: review.reviewId,
    userId: review.userId,
    username: review.username || review.userFullName || '匿名读者',  // 无用户名时显示"匿名读者"
    userFullName: review.userFullName,
    bookId: review.bookId,
    bookTitle: review.bookTitle,
    bookIsbn: review.bookIsbn,
    rating: Number(review.rating || 0),
    commentText: review.commentText || '',
    status: review.status || 'PENDING',   // 默认待审核
    createTime: review.createTime,
  }
}

/**
 * 标准化日期时间输入格式
 * 确保输出为 ISO 格式（YYYY-MM-DDTHH:mm:ss）
 *
 * @param {string} value - 输入的日期时间字符串
 * @returns {string} 标准化后的字符串
 */
function normalizeDateTimeInput(value) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return normalized
  }

  // 已包含 T 分隔符 → 补秒数
  if (normalized.includes('T')) {
    return normalized.length === 16 ? `${normalized}:00` : normalized
  }

  // 空格分隔 → 替换为 T 并补秒数
  return normalized.length === 16
    ? `${normalized.replace(' ', 'T')}:00`
    : normalized.replace(' ', 'T')
}

module.exports = {
  getCurrentApp,
  normalizeRoles,
  mapProfileToSessionUser,
  buildSessionUserFromToken,
  extractPageContent,
  toSearchHistoryKeywords,
  isActiveReservation,
  isActiveLoan,
  mapReview,
  normalizeDateTimeInput,
}
