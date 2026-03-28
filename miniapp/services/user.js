/**
 * @file 用户信息服务模块
 * @description 获取当前登录用户的个人信息和概览统计：
 *   - 获取个人资料（profile）
 *   - 获取用户概览数据（overview）—— 在借数量、即将到期、罚款等统计信息
 *
 *   概览数据主要用于首页 Hero 卡片的统计展示。
 */

const { request } = require('../utils/request')

/**
 * 将后端概览 DTO 映射为前端统一的概览对象
 *
 * 处理逻辑：
 *   - 所有计数字段兜底为 0
 *   - 即将到期借阅列表（dueSoonLoans）中的日期截取前 10 位
 *   - 罚款总额转为数字类型
 *
 * @param {Object} dto - 后端概览数据
 * @returns {Object} 前端概览对象
 */
function mapOverview(dto) {
  return {
    userId: dto.userId,                                              // 用户 ID
    username: dto.username,                                          // 用户名
    fullName: dto.fullName,                                          // 姓名
    activeLoanCount: dto.activeLoanCount || 0,                       // 当前在借数量
    dueSoonLoanCount: dto.dueSoonLoanCount || 0,                     // 即将到期的借阅数量
    dueSoonLoans: (dto.dueSoonLoans || []).map((loan) => ({           // 即将到期的借阅详情列表
      loanId: loan.loanId,
      bookId: loan.bookId,
      bookTitle: loan.bookTitle,
      dueDate: String(loan.dueDate || '').slice(0, 10),              // 到期日期
      daysRemaining: loan.daysRemaining || 0,                        // 剩余天数
      status: loan.status,
    })),
    activeReservationCount: dto.activeReservationCount || 0,         // 有效预约数量
    readyReservationCount: dto.readyReservationCount || 0,           // 可取书的预约数量
    pendingFineCount: dto.pendingFineCount || 0,                     // 待支付罚款数量
    pendingFineTotal: Number(dto.pendingFineTotal || 0),             // 待支付罚款总额
    unreadNotificationCount: dto.unreadNotificationCount || 0,       // 未读通知数量
    favoriteCount: dto.favoriteCount || 0,                           // 收藏图书数量
    pendingServiceAppointmentCount: dto.pendingServiceAppointmentCount || 0,   // 待处理服务预约
    completedServiceAppointmentCount: dto.completedServiceAppointmentCount || 0, // 已完成服务预约
  }
}

// ─── 用户服务对象 ────────────────────────────────────────────────

const userService = {
  /**
   * 获取当前用户的个人资料
   * @returns {Promise<Object>} profile 对象
   */
  getMyProfile() {
    return request({
      url: '/users/me/profile',
      auth: true,
    })
  },

  /**
   * 获取当前用户的概览统计数据
   * @returns {Promise<Object>} 经 mapOverview 处理后的概览对象
   */
  async getMyOverview() {
    const response = await request({
      url: '/users/me/overview',
      auth: true,
    })

    return mapOverview(response)
  },
}

module.exports = {
  userService,
}
