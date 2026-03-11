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

function resolveNotificationTarget(notification) {
  // Reader business pages are not registered in app.json yet, so avoid returning invalid routes.
  return null
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
}
