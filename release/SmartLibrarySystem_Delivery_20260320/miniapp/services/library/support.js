function createSupportLibraryService(deps) {
  const {
    fineService,
    notificationService,
    feedbackService,
    extractPageContent,
  } = deps

  return {
    getFines() {
      return fineService.getMyFines()
    },

    payFine(fineId) {
      return fineService.payFine(Number(fineId))
    },

    async getNotifications() {
      const response = await notificationService.getNotificationsPage(0, 50)
      return extractPageContent(response)
    },

    markNotificationRead(notificationId) {
      return notificationService.markRead(Number(notificationId))
    },

    markAllNotificationsRead() {
      return notificationService.markAllRead()
    },

    deleteNotification(notificationId) {
      return notificationService.deleteNotification(Number(notificationId))
    },

    clearReadNotifications() {
      return notificationService.deleteAllRead()
    },

    async getFeedback() {
      const response = await feedbackService.getMyFeedback(0, 50)
      return extractPageContent(response)
    },

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

module.exports = {
  createSupportLibraryService,
}
