const { libraryService } = require('../../../services/library')
const {
  resolveNotificationTarget,
  getNotificationActionLabel,
} = require('../../../services/notification')

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
    actionLabel: getNotificationActionLabel(item),
    targetUrl: resolveNotificationTarget(item),
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

    try {
      await libraryService.markNotificationRead(notificationId)
      this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '标记失败',
        icon: 'none',
      })
    }
  },

  async markAllRead() {
    try {
      await libraryService.markAllNotificationsRead()
      this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败',
        icon: 'none',
      })
    }
  },

  async deleteOne(event) {
    const notificationId = event.currentTarget.dataset.notificationId

    try {
      await libraryService.deleteNotification(notificationId)
      this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '删除失败',
        icon: 'none',
      })
    }
  },

  async clearRead() {
    try {
      await libraryService.clearReadNotifications()
      this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '清理失败',
        icon: 'none',
      })
    }
  },

  async openTarget(event) {
    const notificationId = Number(event.currentTarget.dataset.notificationId || 0)
    const item = (this.data.items || []).find((notification) => notification.notificationId === notificationId)

    if (!item) {
      return
    }

    try {
      if (!item.isRead) {
        await libraryService.markNotificationRead(item.notificationId)
      }

      if (!item.targetUrl) {
        wx.showToast({
          title: '当前通知暂未提供可跳转页面',
          icon: 'none',
        })
        this.loadNotifications()
        return
      }

      wx.navigateTo({
        url: item.targetUrl,
      })
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '通知跳转失败',
        icon: 'none',
      })
    }
  },
})
