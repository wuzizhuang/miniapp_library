/**
 * @file 图书馆服务 — 支持功能领域
 * @description 创建支持功能相关的 libraryService 方法：
 *   - getFines / payFine                  — 罚款管理
 *   - getNotifications / markNotificationRead / markAllNotificationsRead — 通知
 *   - deleteNotification / clearReadNotifications — 通知清理
 *   - getFeedback / submitFeedback        — 反馈管理
 */

/**
 * 创建支持功能领域服务
 * @param {Object} deps - 依赖注入
 * @returns {Object} 支持功能方法集合
 */
function createSupportLibraryService(deps) {
  const { fineService, notificationService, feedbackService, extractPageContent } = deps

  return {
    /** 获取我的罚款列表 */
    getFines() { return fineService.getMyFines() },

    /** 支付罚款 */
    payFine(fineId) { return fineService.payFine(Number(fineId)) },

    /** 获取通知列表（提取分页内容） */
    async getNotifications() {
      const response = await notificationService.getNotificationsPage(0, 50)
      return extractPageContent(response)
    },

    /** 标记单条通知已读 */
    markNotificationRead(notificationId) { return notificationService.markRead(Number(notificationId)) },

    /** 标记全部通知已读 */
    markAllNotificationsRead() { return notificationService.markAllRead() },

    /** 删除单条通知 */
    deleteNotification(notificationId) { return notificationService.deleteNotification(Number(notificationId)) },

    /** 清除所有已读通知 */
    clearReadNotifications() { return notificationService.deleteAllRead() },

    /** 获取我的反馈列表 */
    async getFeedback() {
      const response = await feedbackService.getMyFeedback(0, 50)
      return extractPageContent(response)
    },

    /**
     * 提交反馈
     * @param {Object} payload - { category, subject, content, contactEmail }
     */
    submitFeedback(payload) {
      return feedbackService.createFeedback({
        category: payload.category,
        subject: payload.subject,
        content: payload.content,
        contactEmail: payload.contactEmail,
      })
    },
  }
}

module.exports = { createSupportLibraryService }
