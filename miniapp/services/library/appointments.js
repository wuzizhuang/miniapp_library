/**
 * @file 图书馆服务 — 预约管理领域
 * @description 创建预约管理相关的 libraryService 方法：
 *   - 服务预约：getAppointments / getActiveLoans / createAppointment / cancelAppointment
 *   - 座位预约：getSeats / getMySeatReservations / createSeatReservation / cancelSeatReservation
 */

/**
 * 创建预约管理领域服务
 * @param {Object} deps - 依赖注入
 * @returns {Object} 预约管理方法集合
 */
function createAppointmentLibraryService(deps) {
  const {
    loanService, seatReservationService, serviceAppointmentService,
    extractPageContent, isActiveLoan, normalizeDateTimeInput,
  } = deps

  return {
    /** 获取我的服务预约列表 */
    async getAppointments() {
      const response = await serviceAppointmentService.getMyAppointments(0, 50)
      return extractPageContent(response)
    },

    /** 获取当前活跃借阅（用于创建还书预约时选择） */
    async getActiveLoans() {
      const loans = await loanService.getMyLoans()
      return (loans || []).filter(isActiveLoan)
    },

    /**
     * 创建服务预约
     * @param {Object} payload - { serviceType, method, scheduledTime, loanId, returnLocation, notes }
     */
    createAppointment(payload) {
      return serviceAppointmentService.createAppointment({
        serviceType: payload.serviceType,
        method: payload.method,
        scheduledTime: normalizeDateTimeInput(payload.scheduledTime),
        loanId: Number(payload.loanId) > 0 ? Number(payload.loanId) : undefined,
        returnLocation: payload.returnLocation || undefined,
        notes: String(payload.notes || '').trim() || undefined,
      })
    },

    /** 取消服务预约 */
    cancelAppointment(appointmentId) {
      return serviceAppointmentService.cancelAppointment(Number(appointmentId))
    },

    /**
     * 查询可用座位
     * @param {Object} params - { floorName, zoneName, startTime, endTime, availableOnly }
     */
    getSeats(params) {
      return seatReservationService.getSeats({
        floorName: params && params.floorName,
        zoneName: params && params.zoneName,
        startTime: normalizeDateTimeInput(params && params.startTime),
        endTime: normalizeDateTimeInput(params && params.endTime),
        availableOnly: params && params.availableOnly,
      })
    },

    /** 获取我的座位预约列表 */
    getMySeatReservations() { return seatReservationService.getMyReservations() },

    /**
     * 创建座位预约
     * @param {Object} payload - { seatId, startTime, endTime, notes }
     */
    createSeatReservation(payload) {
      return seatReservationService.createReservation({
        seatId: Number(payload.seatId),
        startTime: normalizeDateTimeInput(payload.startTime),
        endTime: normalizeDateTimeInput(payload.endTime),
        notes: String(payload.notes || '').trim() || undefined,
      })
    },

    /** 取消座位预约 */
    cancelSeatReservation(reservationId) {
      return seatReservationService.cancelReservation(Number(reservationId))
    },
  }
}

module.exports = { createAppointmentLibraryService }
