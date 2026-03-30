/**
 * @file 服务预约模块
 * @description 管理图书馆服务预约（还书预约、咨询预约等）：
 *   - 创建服务预约
 *   - 获取我的服务预约列表
 *   - 取消服务预约
 *
 *   服务类型包括：RETURN（还书）、PICKUP（取书）、CONSULTATION（咨询）等。
 */

const { request } = require('../utils/request')

/**
 * 映射服务预约 DTO
 * @param {Object} dto - 后端预约数据
 * @returns {Object} 前端预约对象
 */
function mapAppointment(dto) {
  return {
    appointmentId: dto.appointmentId,      // 预约 ID
    userId: dto.userId,                    // 用户 ID
    username: dto.username,                // 用户名
    userFullName: dto.userFullName,        // 用户姓名
    loanId: dto.loanId,                    // 关联借阅 ID（还书时需要）
    bookTitle: dto.bookTitle,              // 关联图书书名
    serviceType: dto.serviceType,          // 服务类型
    method: dto.method,                    // 办理方式
    status: dto.status,                    // 预约状态
    scheduledTime: dto.scheduledTime,      // 预约时间
    returnLocation: dto.returnLocation,    // 还书地点
    notes: dto.notes,                      // 备注
    createTime: dto.createTime,            // 创建时间
    updateTime: dto.updateTime,            // 更新时间
  }
}

const serviceAppointmentService = {
  /** 创建服务预约 */
  async createAppointment(payload) {
    const response = await request({
      url: '/service-appointments', method: 'POST', data: payload, auth: true,
    })
    return mapAppointment(response)
  },

  /** 获取我的服务预约列表（分页） */
  async getMyAppointments(page, size) {
    const response = await request({
      url: '/service-appointments/me',
      query: { page: page || 0, size: size || 50 },
      auth: true,
    })
    return { ...response, content: (response.content || []).map(mapAppointment) }
  },

  /** 取消服务预约 */
  cancelAppointment(appointmentId) {
    return request({
      url: `/service-appointments/${appointmentId}/cancel`, method: 'PUT', auth: true,
    })
  },
}

module.exports = { serviceAppointmentService }
