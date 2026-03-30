/**
 * @file 搜索服务模块
 * @description 处理搜索相关的辅助功能：
 *   - 获取热门搜索关键词（展示在搜索框下方）
 *   - 获取搜索建议（输入时实时联想）
 *   - 获取当前用户的搜索历史记录
 *
 *   注：实际的图书搜索由 bookService.getBooks({ keyword }) 执行，
 *   本模块只负责搜索体验的辅助功能。
 */

const { request } = require('../utils/request')

const searchService = {
  /**
   * 获取热门搜索关键词
   * @param {number} [limit=8] - 返回的关键词数量上限
   * @returns {Promise<string[]>} 热门关键词数组
   */
  getHotKeywords(limit) {
    return request({
      url: '/search/hot',
      query: { limit: limit || 8 },
    })
  },

  /**
   * 根据输入内容获取搜索建议（联想词）
   *
   * 空输入时直接返回空数组，避免无意义的网络请求
   *
   * @param {string} keyword   - 用户输入的搜索词
   * @param {number} [limit=8] - 返回的建议数量上限
   * @returns {Promise<string[]>} 搜索建议数组
   */
  getSuggestions(keyword, limit) {
    const normalizedKeyword = String(keyword || '').trim()

    // 空输入 → 不发请求
    if (!normalizedKeyword) {
      return Promise.resolve([])
    }

    return request({
      url: '/search/suggestions',
      query: {
        keyword: normalizedKeyword,
        limit: limit || 8,
      },
    })
  },

  /**
   * 获取当前用户的搜索历史记录
   * @param {number} [page=0]  - 页码
   * @param {number} [size=20] - 每页数量
   * @returns {Promise<Object>} 分页响应（content 中每项含 keyword 字段）
   */
  getMyHistory(page, size) {
    return request({
      url: '/search/history',
      query: {
        page: page || 0,
        size: size || 20,
      },
      auth: true,
    })
  },
}

module.exports = {
  searchService,
}
