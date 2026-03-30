/**
 * @file 反馈服务模块
 * @description 处理用户反馈/投诉/建议的提交和查看：
 *   - 提交新反馈
 *   - 获取当前用户的历史反馈列表
 *
 *   反馈分类包括：建议、投诉、功能请求等。
 */

const { request } = require('../utils/request')

const feedbackService = {
  /**
   * 提交一条新的反馈
   * @param {Object} payload - 反馈内容
   * @param {string} payload.category     - 反馈分类（如 SUGGESTION / COMPLAINT）
   * @param {string} payload.subject      - 反馈主题
   * @param {string} payload.content      - 反馈详细内容
   * @param {string} [payload.contactEmail] - 联系邮箱（可选）
   * @returns {Promise<Object>} 提交结果
   */
  createFeedback(payload) {
    return request({
      url: '/feedback',
      method: 'POST',
      data: payload,
      auth: true,
    })
  },

  /**
   * 获取当前用户的反馈历史列表
   * @param {number} [page=0]  - 页码
   * @param {number} [size=10] - 每页数量
   * @returns {Promise<Object>} 分页响应对象
   */
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
