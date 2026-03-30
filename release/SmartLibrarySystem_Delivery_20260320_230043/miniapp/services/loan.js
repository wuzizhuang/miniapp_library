/**
 * @file 借阅服务模块
 * @description 处理图书借阅相关的所有 API 调用：
 *   - 获取当前借阅列表 / 借阅历史
 *   - 获取单笔借阅详情
 *   - 创建借阅（借书）/ 续借 / 归还
 *
 *   借阅状态流转：
 *     ACTIVE（在借）→ 续借 / 归还
 *     RETURNED（已归还）
 *     OVERDUE（已逾期，仍可归还）
 *
 *   前端将 ACTIVE 映射为 BORROWED 以便 UI 展示。
 */

const { request } = require('../utils/request')

/**
 * 映射借阅状态：后端 ACTIVE → 前端 BORROWED
 * 其他状态保持不变
 * @param {string} status - 后端状态字符串
 * @returns {string} 前端展示用的状态
 */
function mapLoanStatus(status) {
  if (status === 'ACTIVE') {
    return 'BORROWED'
  }

  return status
}

/**
 * 将后端借阅 DTO 映射为前端统一的借阅对象
 *
 * 处理逻辑：
 *   - 日期截取前 10 位（只保留 YYYY-MM-DD）
 *   - 判断是否可续借（续借次数 < 2 且状态为 ACTIVE）
 *   - 状态重映射（ACTIVE → BORROWED）
 *
 * @param {Object} dto - 后端借阅数据
 * @returns {Object} 前端借阅对象
 */
function mapLoan(dto) {
  return {
    loanId: dto.loanId,                                           // 借阅 ID
    bookTitle: dto.bookTitle,                                     // 书名
    bookIsbn: dto.bookIsbn,                                       // ISBN
    bookCover: dto.bookCoverUrl,                                  // 封面 URL
    bookAuthorNames: dto.bookAuthorNames,                         // 作者名列表
    categoryName: dto.categoryName,                               // 分类名
    locationCode: dto.locationCode,                               // 馆藏位置编号
    borrowDate: String(dto.borrowDate || '').slice(0, 10),        // 借阅日期（YYYY-MM-DD）
    dueDate: String(dto.dueDate || '').slice(0, 10),              // 应还日期
    returnDate: dto.returnDate ? String(dto.returnDate).slice(0, 10) : undefined,  // 实际归还日期
    status: mapLoanStatus(dto.status),                            // 借阅状态
    daysOverdue: dto.daysOverdue,                                 // 逾期天数
    daysRemaining: dto.daysRemaining,                             // 剩余天数
    renewalCount: dto.renewalCount || 0,                          // 已续借次数
    canRenew: (dto.renewalCount || 0) < 2 && dto.status === 'ACTIVE',  // 是否可续借（最多续借 2 次）
    copyId: dto.copyId,                                           // 副本 ID
    bookId: dto.bookId,                                           // 图书 ID
  }
}

// ─── 借阅服务对象 ────────────────────────────────────────────────

const loanService = {
  /**
   * 获取当前用户的有效借阅列表（在借 + 逾期）
   * @returns {Promise<Object[]>} 借阅对象数组
   */
  async getMyLoans() {
    const response = await request({
      url: '/loans/my',
      query: { page: 0, size: 50 },
      auth: true,
    })

    return (response.content || []).map(mapLoan)
  },

  /**
   * 获取当前用户的历史借阅记录（含已归还）
   * @returns {Promise<Object[]>} 借阅对象数组
   */
  async getMyLoanHistory() {
    const response = await request({
      url: '/loans/history',
      query: { page: 0, size: 100 },
      auth: true,
    })

    return (response.content || []).map(mapLoan)
  },

  /**
   * 根据 ID 获取单笔借阅详情
   * @param {number} loanId - 借阅 ID
   * @returns {Promise<Object>} 借阅对象
   */
  async getLoanById(loanId) {
    const response = await request({
      url: `/loans/${loanId}`,
      auth: true,
    })

    return mapLoan(response)
  },

  /**
   * 创建新的借阅记录（借书）
   * @param {number} copyId - 要借阅的副本 ID
   * @returns {Promise<Object>} 创建结果
   */
  createLoan(copyId) {
    return request({
      url: '/loans',
      method: 'POST',
      data: { copyId },
      auth: true,
    })
  },

  /**
   * 续借某笔借阅（延长还书日期）
   * 注意：每笔借阅最多续借 2 次
   * @param {number} loanId - 借阅 ID
   * @returns {Promise<Object>} 续借结果
   */
  renewLoan(loanId) {
    return request({
      url: `/loans/${loanId}/renew`,
      method: 'PUT',
      auth: true,
    })
  },

  /**
   * 归还图书
   * @param {number} loanId - 借阅 ID
   * @returns {Promise<Object>} 归还结果
   */
  returnLoan(loanId) {
    return request({
      url: `/loans/${loanId}/return`,
      method: 'PUT',
      auth: true,
    })
  },
}

module.exports = {
  loanService,
}
