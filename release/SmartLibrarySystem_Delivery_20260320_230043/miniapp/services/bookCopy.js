/**
 * @file 图书副本服务模块
 * @description 处理图书副本（实体馆藏）的 API 调用。
 *   每本图书可有多个副本，分布在不同馆藏位置，
 *   借阅操作实际针对的是具体副本（copyId）而非图书本身。
 */

const { request } = require('../utils/request')

const bookCopyService = {
  /**
   * 根据图书 ID 获取该书的所有副本信息
   *
   * 返回数据通常包含：copyId / status / locationCode 等
   * 用于判断是否有可借副本（status === 'AVAILABLE'）
   *
   * @param {number} bookId - 图书 ID
   * @returns {Promise<Object[]>} 副本对象数组
   */
  getByBookId(bookId) {
    return request({
      url: `/books/${bookId}/copies`,
    })
  },
}

module.exports = {
  bookCopyService,
}
