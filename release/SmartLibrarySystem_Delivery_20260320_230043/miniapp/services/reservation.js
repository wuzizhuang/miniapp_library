/**
 * @file 预约服务模块
 * @description 处理图书预约相关的 API 调用：
 *   - 获取我的预约列表（分页 / 全量）
 *   - 创建预约（对无可借副本的图书排队等待）
 *   - 取消预约
 *
 *   预约状态流转：
 *     PENDING（排队中）→ AWAITING_PICKUP（到书待取）→ FULFILLED（已完成）
 *     PENDING / AWAITING_PICKUP → CANCELLED（已取消）
 *     PENDING → EXPIRED（已过期）
 */

const { request } = require('../utils/request')

/**
 * 将后端预约 DTO 映射为前端统一的预约对象
 * @param {Object} dto - 后端预约数据
 * @returns {Object} 前端预约对象
 */
function mapReservation(dto) {
  return {
    reservationId: dto.reservationId,                              // 预约 ID
    bookId: dto.bookId,                                            // 图书 ID
    bookTitle: dto.bookTitle,                                      // 书名
    bookIsbn: dto.bookIsbn,                                        // ISBN
    coverUrl: dto.coverUrl,                                        // 封面 URL
    status: dto.status,                                            // 预约状态
    queuePosition: dto.queuePosition,                              // 排队位置
    reservationDate: String(dto.reservationDate || '').slice(0, 10), // 预约日期
    expiryDate: dto.expiryDate ? String(dto.expiryDate).slice(0, 10) : undefined, // 过期日期
  }
}

// ─── 预约服务对象 ────────────────────────────────────────────────

const reservationService = {
  /**
   * 分页获取当前用户的预约列表
   * @param {number} [page=0]  - 页码
   * @param {number} [size=10] - 每页数量
   * @returns {Promise<Object>} { items, totalPages, totalElements, page, size }
   */
  async getMyReservationsPage(page, size) {
    const response = await request({
      url: '/reservations/me',
      query: {
        page: page || 0,
        size: size || 10,
      },
      auth: true,
    })

    return {
      items: (response.content || []).map(mapReservation),
      totalPages: Math.max(1, response.totalPages || 1),
      totalElements: response.totalElements || 0,
      page: response.number || 0,
      size: response.size || size || 10,
    }
  },

  /**
   * 获取全部预约记录（不分页，一次性拉取）
   * @returns {Promise<Object[]>} 预约对象数组
   */
  async getMyReservations() {
    const response = await this.getMyReservationsPage(0, 100)

    return response.items
  },

  /**
   * 创建图书预约
   * 当图书没有可借副本时，用户可发起预约排队
   * @param {number} bookId - 图书 ID
   * @returns {Promise<Object>} 创建结果
   */
  createReservation(bookId) {
    return request({
      url: '/reservations',
      method: 'POST',
      data: { bookId },
      auth: true,
    })
  },

  /**
   * 取消预约
   * @param {number} reservationId - 预约 ID
   * @returns {Promise<Object>} 取消结果
   */
  cancelReservation(reservationId) {
    return request({
      url: `/reservations/${reservationId}/cancel`,
      method: 'PUT',
      auth: true,
    })
  },
}

module.exports = {
  reservationService,
}
