/**
 * @file 评价服务模块
 * @description 处理图书评价（书评）相关的 API 调用：
 *   - 获取某本书的评价列表
 *   - 创建新评价
 *   - 获取我的评价列表
 *   - 更新 / 删除评价
 *
 *   评价包含评分（1-5 分）和评论文字，提交后需管理员审核。
 */

const { request } = require('../utils/request')

const reviewService = {
  /**
   * 获取指定图书的评价列表
   * @param {number} bookId    - 图书 ID
   * @param {number} [page=0]  - 页码
   * @param {number} [size=50] - 每页数量
   * @returns {Promise<Object>} 分页响应（按创建时间倒序排列）
   */
  getBookReviews(bookId, page, size) {
    return request({
      url: `/books/${bookId}/reviews`,
      query: {
        page: page || 0,
        size: size || 50,
        sortBy: 'createTime',    // 按创建时间排序
        direction: 'DESC',       // 降序（最新在前）
      },
    })
  },

  /**
   * 创建一条新的图书评价
   * @param {Object} payload - 评价数据
   * @param {number} payload.bookId       - 图书 ID
   * @param {number} payload.rating       - 评分（1-5）
   * @param {string} payload.commentText  - 评论内容
   * @returns {Promise<Object>} 创建结果
   */
  createReview(payload) {
    return request({
      url: '/reviews',
      method: 'POST',
      data: payload,
      auth: true,
    })
  },

  /**
   * 获取当前用户的评价列表
   * @param {number} [page=0]  - 页码
   * @param {number} [size=20] - 每页数量
   * @returns {Promise<Object>} 分页响应
   */
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

  /**
   * 更新已有评价
   * @param {number} reviewId  - 评价 ID
   * @param {Object} payload   - 更新数据 { rating, commentText }
   * @returns {Promise<Object>} 更新结果
   */
  updateReview(reviewId, payload) {
    return request({
      url: `/reviews/${reviewId}`,
      method: 'PUT',
      data: payload,
      auth: true,
    })
  },

  /**
   * 删除评价
   * @param {number} reviewId - 评价 ID
   * @returns {Promise<Object>}
   */
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
