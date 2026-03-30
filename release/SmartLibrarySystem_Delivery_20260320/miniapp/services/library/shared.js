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

async function buildSessionUserFromToken(authService, token) {
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
