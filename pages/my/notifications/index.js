const { libraryService } = require('../../../services/library')

function decorateNotification(item) {
  const typeLabelMap = {
    DUE_REMINDER: '到期提醒',
    ARRIVAL_NOTICE: '到馆提醒',
    NEW_BOOK_RECOMMEND: '荐书动态',
    SYSTEM: '系统消息',
  }

  return {
    ...item,
    typeLabel: typeLabelMap[item.type] || item.type,
    createDate: String(item.createTime || '').replace('T', ' ').slice(0, 16),
  }
}

Page({
  data: {
    items: [],
    loading: true,
    errorMessage: '',
  },

  onShow() {
    this.loadNotifications()
  },

  async loadNotifications() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getNotifications()
      this.setData({
        items: (items || []).map(decorateNotification),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '通知加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  async markRead(event) {
    const notificationId = event.currentTarget.dataset.notificationId
    await libraryService.markNotificationRead(notificationId)
    this.loadNotifications()
  },

  async markAllRead() {
    await libraryService.markAllNotificationsRead()
    this.loadNotifications()
  },

  async deleteOne(event) {
    const notificationId = event.currentTarget.dataset.notificationId
    await libraryService.deleteNotification(notificationId)
    this.loadNotifications()
  },

  async clearRead() {
    await libraryService.clearReadNotifications()
    this.loadNotifications()
  },

  async openTarget(event) {
    const notificationId = Number(event.currentTarget.dataset.notificationId || 0)
    const item = (this.data.items || []).find((notification) => notification.notificationId === notificationId)

    if (!item) {
      return
    }

    if (!item.isRead) {
      await libraryService.markNotificationRead(item.notificationId)
    }

    if (item.targetType === 'LOAN') {
      wx.navigateTo({
        url: `/pages/my/loan-tracking/index?loanId=${item.targetId}`,
      })
      return
    }

    if (item.targetType === 'RESERVATION') {
      wx.navigateTo({
        url: '/pages/my/reservations/index',
      })
      return
    }

    if (item.targetType === 'RECOMMENDATION') {
      wx.navigateTo({
        url: '/pages/my/recommendations/index',
      })
      return
    }

    if (item.targetType === 'FEEDBACK') {
      wx.navigateTo({
        url: '/pages/help-feedback/index',
      })
      return
    }

    this.loadNotifications()
  },
})
