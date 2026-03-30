/**
 * @file 收藏服务模块
 * @description 管理用户的图书收藏功能：
 *   - 获取我的收藏列表
 *   - 检查某本书是否已收藏
 *   - 添加 / 取消收藏
 *
 *   所有接口均需要鉴权（auth: true）。
 */

const { request } = require('../utils/request')

/**
 * 将后端收藏列表中的图书 DTO 映射为前端统一图书对象
 *
 * 与 book.js 中的 mapBook 结构一致，保证收藏列表和图书列表的数据格式统一。
 *
 * @param {Object} item - 后端返回的图书数据
 * @returns {Object} 前端图书对象
 */
function mapBook(item) {
  return {
    bookId: item.bookId,                                          // 图书 ID
    isbn: item.isbn || '',                                        // ISBN 编号
    title: item.title,                                            // 书名
    coverUrl: item.coverUrl,                                      // 封面 URL
    resourceMode: item.resourceMode,                              // 资源模式
    onlineAccessUrl: item.onlineAccessUrl,                        // 在线阅读链接
    onlineAccessType: item.onlineAccessType,                      // 在线阅读类型
    description: item.description,                                // 简介
    language: item.language,                                      // 语言
    publishYear: item.publishedYear,                              // 出版年份
    publisherName: item.publisherName,                            // 出版社
    categoryId: item.categoryId,                                  // 分类 ID
    categoryName: item.categoryName,                              // 分类名
    categoryNames: item.categoryName ? [item.categoryName] : [],  // 分类名数组
    authorNames: (item.authors || []).map((author) => author.name), // 作者名列表
    inventoryCount: item.totalCopies || item.availableCopies || 0,  // 总库存
    availableCount: item.availableCopies || 0,                      // 可借数量
    availableCopies: item.availableCopies || 0,                     // 可借副本数
    totalCopies: item.totalCopies || item.availableCopies || 0,     // 总副本数
    avgRating: item.avgRating,                                      // 平均评分
    reviewCount: item.reviewCount,                                  // 评价数
  }
}

// ─── 收藏服务对象 ────────────────────────────────────────────────

const favoriteService = {
  /**
   * 获取当前用户的收藏列表
   * @param {number} [page=0]   - 页码
   * @param {number} [size=100] - 每页数量（默认拉取全部）
   * @returns {Promise<Object[]>} 图书对象数组
   */
  async getMyFavorites(page, size) {
    const response = await request({
      url: '/user-favorites',
      query: {
        page: page || 0,
        size: size || 100,
      },
      auth: true,
    })

    return (response.content || []).map(mapBook)
  },

  /**
   * 检查某本书是否在当前用户的收藏中
   * @param {number} bookId - 图书 ID
   * @returns {Promise<boolean>} 是否已收藏
   */
  checkFavorite(bookId) {
    return request({
      url: `/user-favorites/${bookId}/check`,
      auth: true,
    }).then((value) => Boolean(value))
  },

  /**
   * 将图书添加到收藏
   * @param {number} bookId - 图书 ID
   * @returns {Promise<Object>}
   */
  addFavorite(bookId) {
    return request({
      url: `/user-favorites/${bookId}`,
      method: 'POST',
      auth: true,
    })
  },

  /**
   * 取消收藏某本图书
   * @param {number} bookId - 图书 ID
   * @returns {Promise<Object>}
   */
  removeFavorite(bookId) {
    return request({
      url: `/user-favorites/${bookId}`,
      method: 'DELETE',
      auth: true,
    })
  },
}

module.exports = {
  favoriteService,
}
