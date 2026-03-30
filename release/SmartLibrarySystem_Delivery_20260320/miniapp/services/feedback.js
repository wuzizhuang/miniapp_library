const { request } = require('../utils/request')

const feedbackService = {
  createFeedback(payload) {
    return request({
      url: '/feedback',
      method: 'POST',
      data: payload,
      auth: true,
    })
  },

  getMyFeedback(page, size) {
    return request({
      url: '/feedback/me',
      query: {
        page: page || 0,
        size: size || 10,
      },
      auth: true,
    })
  },
}

module.exports = {
  feedbackService,
}
