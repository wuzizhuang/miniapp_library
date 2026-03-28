/**
 * @file 座位预约服务模块
 * @description 管理图书馆座位预约功能：
 *   - 查询可用座位（支持按楼层、区域、时间段筛选）
 *   - 创建座位预约 / 取消座位预约
 *   - 获取我的座位预约列表
 */

const { request } = require('../utils/request')

/**
 * 映射座位信息 DTO
 * @param {Object} dto - 后端座位数据
 * @returns {Object} 前端座位对象
 */
function mapSeat(dto) {
  return {
    seatId: dto.seatId,                  // 座位 ID
    seatCode: dto.seatCode,              // 座位编号（如 A-12）
    floorName: dto.floorName,            // 楼层名称
    floorOrder: dto.floorOrder,          // 楼层排序
    zoneName: dto.zoneName,              // 区域名称
    areaName: dto.areaName,              // 区域描述
    seatType: dto.seatType,              // 座位类型
    status: dto.status,                  // 座位状态
    hasPower: Boolean(dto.hasPower),      // 是否有电源
    nearWindow: Boolean(dto.nearWindow),  // 是否靠窗
    description: dto.description,        // 座位描述
    available: Boolean(dto.available),    // 是否可预约
  }
}

/**
 * 映射座位预约信息 DTO
 * @param {Object} dto - 后端预约数据
 * @returns {Object} 前端预约对象
 */
function mapReservation(dto) {
  return {
    reservationId: dto.reservationId,    // 预约 ID
    userId: dto.userId,                  // 用户 ID
    username: dto.username,              // 用户名
    userFullName: dto.userFullName,      // 用户姓名
    seatId: dto.seatId,                  // 座位 ID
    seatCode: dto.seatCode,              // 座位编号
    floorName: dto.floorName,            // 楼层
    zoneName: dto.zoneName,              // 区域
    areaName: dto.areaName,              // 区域描述
    seatType: dto.seatType,              // 座位类型
    startTime: dto.startTime,            // 预约开始时间
    endTime: dto.endTime,                // 预约结束时间
    status: dto.status,                  // 预约状态
    notes: dto.notes,                    // 备注
    createTime: dto.createTime,          // 创建时间
    updateTime: dto.updateTime,          // 更新时间
  }
}

const seatReservationService = {
  /** 查询座位列表（支持筛选） */
  async getSeats(params) {
    const response = await request({
      url: '/seats',
      query: {
        floorName: params && params.floorName,
        zoneName: params && params.zoneName,
        startTime: params && params.startTime,
        endTime: params && params.endTime,
        availableOnly: params && params.availableOnly,
      },
      auth: true,
    })
    return (response || []).map(mapSeat)
  },

  /** 创建座位预约 */
  async createReservation(payload) {
    const response = await request({
      url: '/seat-reservations', method: 'POST', data: payload, auth: true,
    })
    return mapReservation(response)
  },

  /** 获取我的座位预约列表 */
  async getMyReservations() {
    const response = await request({ url: '/seat-reservations/me', auth: true })
    return (response || []).map(mapReservation)
  },

  /** 取消座位预约 */
  cancelReservation(reservationId) {
    return request({ url: `/seat-reservations/${reservationId}/cancel`, method: 'PUT', auth: true })
  },
}

module.exports = { seatReservationService }
