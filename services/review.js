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

  getMyReviews(page, size) {
    return request({
      url: '/reviews/me',
      query: {
        page: page || 0,
        size: size || 20,
      },
      auth: true,
    })
  },

  updateReview(reviewId, payload) {
    return request({
      url: `/reviews/${reviewId}`,
      method: 'PUT',
      data: payload,
      auth: true,
    })
  },

  deleteReview(reviewId) {
    return request({
      url: `/reviews/${reviewId}`,
      method: 'DELETE',
      auth: true,
    })
  },
}

module.exports = {
  reviewService,
}
