const { request } = require('../utils/request')

function mapNotification(dto) {
  return {
    notificationId: dto.notificationId,
    title: dto.title,
    content: dto.content,
    type: dto.type,
    isRead: dto.isRead,
    createTime: dto.sendTime,
    relatedEntityId: dto.relatedEntityId,
    targetType: dto.targetType,
    targetId: dto.targetId,
    routeHint: dto.routeHint,
    businessKey: dto.businessKey,
  }
}

function buildTargetWithHighlight(basePath, key, value) {
  if (!value) {
    return basePath
  }

  const separator = basePath.indexOf('?') >= 0 ? '&' : '?'

  return `${basePath}${separator}${key}=${encodeURIComponent(String(value))}`
}

function resolveNotificationTarget(notification) {
  if (!notification) {
    return null
  }

  if (notification.targetType === 'RECOMMENDATION') {
    return buildTargetWithHighlight(
      '/pages/my/recommendations/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.targetType === 'LOAN') {
    return notification.targetId
      ? `/pages/my/loan-tracking/index?loanId=${encodeURIComponent(
          String(notification.targetId),
        )}`
      : '/pages/my/shelf/index'
  }

  if (notification.targetType === 'RESERVATION') {
    return buildTargetWithHighlight(
      '/pages/my/reservations/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.targetType === 'SERVICE_APPOINTMENT') {
    return buildTargetWithHighlight(
      '/pages/my/appointments/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.targetType === 'FINE') {
    return buildTargetWithHighlight(
      '/pages/my/fines/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.targetType === 'FEEDBACK') {
    return buildTargetWithHighlight(
      '/pages/help-feedback/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.routeHint) {
    return notification.routeHint
  }

  if (notification.type === 'ARRIVAL_NOTICE') {
    return '/pages/my/reservations/index'
  }

  if (notification.type === 'NEW_BOOK_RECOMMEND') {
    return buildTargetWithHighlight(
      '/pages/my/recommendations/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.type === 'DUE_REMINDER') {
    return notification.targetId
      ? `/pages/my/loan-tracking/index?loanId=${encodeURIComponent(
          String(notification.targetId),
        )}`
      : '/pages/my/shelf/index'
  }

  const joinedText = `${notification.title || ''} ${notification.content || ''}`

  if (joinedText.indexOf('罚款') >= 0) {
    return '/pages/my/fines/index'
  }

  if (joinedText.indexOf('反馈') >= 0) {
    return '/pages/help-feedback/index'
  }

  if (joinedText.indexOf('预约') >= 0) {
    return '/pages/my/reservations/index'
  }

  if (joinedText.indexOf('借阅') >= 0) {
    return notification.targetId
      ? `/pages/my/loan-tracking/index?loanId=${encodeURIComponent(
          String(notification.targetId),
        )}`
      : '/pages/my/shelf/index'
  }

  return null
}

function getNotificationActionLabel(notification) {
  if (!notification) {
    return '查看相关'
  }

  const targetType = notification && notification.targetType
  const joinedText = `${notification && notification.title ? notification.title : ''} ${
    notification && notification.content ? notification.content : ''
  }`

  if (targetType === 'RECOMMENDATION' || notification.type === 'NEW_BOOK_RECOMMEND') {
    return '查看推荐'
  }

  if (targetType === 'RESERVATION' || notification.type === 'ARRIVAL_NOTICE') {
    return '查看预约'
  }

  if (targetType === 'SERVICE_APPOINTMENT') {
    return '查看服务预约'
  }

  if (targetType === 'FINE' || joinedText.indexOf('罚款') >= 0) {
    return '查看罚款'
  }

  if (targetType === 'LOAN' || notification.type === 'DUE_REMINDER') {
    return '查看借阅'
  }

  if (targetType === 'FEEDBACK' || joinedText.indexOf('反馈') >= 0) {
    return '查看反馈'
  }

  return '查看相关'
}

const notificationService = {
  async getNotificationsPage(page, size) {
    const response = await request({
      url: '/notifications',
      query: {
        page: page || 0,
        size: size || 20,
      },
      auth: true,
    })

    return {
      ...response,
      content: (response.content || []).map(mapNotification),
    }
  },

  getUnreadCount() {
    return request({
      url: '/notifications/unread-count',
      auth: true,
    }).then((value) => (typeof value === 'number' ? value : 0))
  },

  markRead(notificationId) {
    return request({
      url: `/notifications/${notificationId}/read`,
      method: 'PUT',
      auth: true,
    })
  },

  markAllRead() {
    return request({
      url: '/notifications/read-all',
      method: 'PUT',
      auth: true,
    })
  },

  deleteNotification(notificationId) {
    return request({
      url: `/notifications/${notificationId}`,
      method: 'DELETE',
      auth: true,
    })
  },

  deleteAllRead() {
    return request({
      url: '/notifications/read',
      method: 'DELETE',
      auth: true,
    })
  },
}

module.exports = {
  notificationService,
  resolveNotificationTarget,
  getNotificationActionLabel,
}
