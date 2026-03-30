/**
 * @file 罚款服务模块
 * @description 管理用户的图书馆罚款：
 *   - 获取我的罚款列表（分页 / 全量）
 *   - 支付罚款
 *
 *   罚款产生场景：逾期未还、图书损坏、图书丢失等。
 *   罚款状态：PENDING（待支付）/ PAID（已支付）/ WAIVED（已减免）
 */

const { request } = require('../utils/request')

/**
 * 将后端罚款 DTO 映射为前端统一的罚款对象
 * @param {Object} dto - 后端罚款数据
 * @returns {Object} 前端罚款对象
 */
function mapFine(dto) {
  return {
    fineId: dto.fineId,                                        // 罚款 ID
    loanId: dto.loanId,                                        // 关联的借阅 ID
    bookTitle: dto.bookTitle,                                  // 关联图书的书名
    amount: dto.amount,                                        // 罚款金额
    status: dto.status,                                        // 罚款状态
    type: dto.type,                                            // 罚款类型（逾期 / 损坏 / 丢失）
    reason: dto.reason,                                        // 罚款原因描述
    createTime: String(dto.dateIssued || '').slice(0, 10),     // 开具日期（YYYY-MM-DD）
    paidTime: dto.datePaid ? String(dto.datePaid).slice(0, 10) : undefined, // 支付日期
  }
}

// ─── 罚款服务对象 ────────────────────────────────────────────────

const fineService = {
  /**
   * 分页获取当前用户的罚款列表
   * @param {number} [page=0]  - 页码
   * @param {number} [size=10] - 每页数量
   * @returns {Promise<Object>} { items, totalPages, totalElements, page, size }
   */
  async getMyFinesPage(page, size) {
    const response = await request({
      url: '/fines/me',
      query: {
        page: page || 0,
        size: size || 10,
      },
      auth: true,
    })

    return {
      items: (response.content || []).map(mapFine),
      totalPages: Math.max(1, response.totalPages || 1),
      totalElements: response.totalElements || 0,
      page: response.number || 0,
      size: response.size || size || 10,
    }
  },

  /**
   * 获取全部罚款记录（不分页）
   * @returns {Promise<Object[]>} 罚款对象数组
   */
  async getMyFines() {
    const response = await this.getMyFinesPage(0, 100)

    return response.items
  },

  /**
   * 支付罚款
   * @param {number} fineId - 罚款 ID
   * @returns {Promise<Object>} 支付结果
   */
  payFine(fineId) {
    return request({
      url: `/fines/${fineId}/pay`,
      method: 'POST',
      auth: true,
    })
  },
}

module.exports = {
  fineService,
}
