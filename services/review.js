const { request } = require('../utils/request')

const reviewService = {
  getBookReviews(bookId, page, size) {
    return request({
      url: `/books/${bookId}/reviews`,
      query: {
        page: page || 0,
        size: size || 50,
        sortBy: 'createTime',
        direction: 'DESC',
      },
    })
  },

  createReview(payload) {
    return request({
      url: '/reviews',
      method: 'POST',
      data: payload,
      auth: true,
    })
  },
}

module.exports = {
  reviewService,
}
