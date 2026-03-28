/**
 * @file 我的通知页面逻辑
 * @description 通知中心页面，功能：
 *   - 查看通知列表（到期提醒/到馆提醒/荐书动态/系统消息）
 *   - 标记单条已读 / 全部已读
 *   - 删除单条通知 / 清除所有已读通知
 *   - 点击通知跳转到关联页面（借阅/预约/罚款等）
 */

const { libraryService } = require('../../../services/library')
const { confirmAction } = require('../../../utils/interaction')

// 引入通知跳转目标解析和操作按钮文案生成
const {
  resolveNotificationTarget,
  getNotificationActionLabel,
} = require('../../../services/notification')

/**
 * 装饰通知数据，补充类型标签、日期、操作文案和跳转链接
 * @param {Object} item - 原始通知数据
 * @returns {Object} 装饰后的通知视图模型
 */
function decorateNotification(item) {
  /** 通知类型标签映射 */
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
    actionLabel: getNotificationActionLabel(item),       // 操作按钮文案
    targetUrl: resolveNotificationTarget(item),           // 跳转目标 URL
  }
}

Page({
  /**
   * 页面数据
   * @property {Object[]} items      - 通知列表
   * @property {boolean} loading     - 加载中
   * @property {string} errorMessage - 错误信息
   */
  data: {
    items: [],
    loading: true,
    errorMessage: '',
    actionKey: '',
  },

  /** 每次显示页面时加载通知列表 */
  onShow() {
    this.loadNotifications()
  },

  /** 加载通知列表 */
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

  /** 标记单条通知为已读 */
  async markRead(event) {
    const notificationId = Number(event.currentTarget.dataset.notificationId || 0)
    const actionKey = `mark-read-${notificationId}`

    if (!notificationId || this.data.actionKey) {
      return
    }

    this.setData({
      actionKey,
    })

    try {
      await libraryService.markNotificationRead(notificationId)
      await this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '标记失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionKey: '',
      })
    }
  },

  /** 标记所有通知为已读 */
  async markAllRead() {
    if (this.data.actionKey) {
      return
    }

    this.setData({
      actionKey: 'mark-all',
    })

    try {
      await libraryService.markAllNotificationsRead()
      await this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionKey: '',
      })
    }
  },

  /** 删除单条通知 */
  async deleteOne(event) {
    const notificationId = Number(event.currentTarget.dataset.notificationId || 0)
    const actionKey = `delete-${notificationId}`

    if (!notificationId || this.data.actionKey) {
      return
    }

    const confirmed = await confirmAction({
      title: '确认删除通知',
      content: '删除后将无法在通知中心再次查看这条消息。',
      confirmText: '确认删除',
    })

    if (!confirmed) {
      return
    }

    this.setData({
      actionKey,
    })

    try {
      await libraryService.deleteNotification(notificationId)
      await this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '删除失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionKey: '',
      })
    }
  },

  /** 清除所有已读通知 */
  async clearRead() {
    if (this.data.actionKey) {
      return
    }

    const confirmed = await confirmAction({
      title: '确认清空已读',
      content: '确认清空所有已读通知吗？该操作无法恢复。',
      confirmText: '确认清空',
    })

    if (!confirmed) {
      return
    }

    this.setData({
      actionKey: 'clear-read',
    })

    try {
      await libraryService.clearReadNotifications()
      await this.loadNotifications()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '清理失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionKey: '',
      })
    }
  },

  /**
   * 点击通知，跳转到关联页面
   *
   * 流程：
   *   1. 如果通知未读，先标记已读
   *   2. 如果有跳转目标，执行页面导航
   *   3. 如果无跳转目标，提示用户
   */
  async openTarget(event) {
    const notificationId = Number(event.currentTarget.dataset.notificationId || 0)
    const item = (this.data.items || []).find((notification) => notification.notificationId === notificationId)

    if (!item) {
      return
    }

    try {
      // 未读通知先标记已读
      if (!item.isRead) {
        await libraryService.markNotificationRead(item.notificationId)
      }

      // 无跳转目标 → 提示
      if (!item.targetUrl) {
        wx.showToast({
          title: '当前通知暂未提供可跳转页面',
          icon: 'none',
        })
        this.loadNotifications()
        return
      }

      // 跳转到目标页面
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

  /** 重试加载通知列表 */
  retryLoadNotifications() {
    this.loadNotifications()
  },
})
