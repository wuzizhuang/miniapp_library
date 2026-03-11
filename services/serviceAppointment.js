const { request } = require('../utils/request')

function mapAppointment(dto) {
  return {
    appointmentId: dto.appointmentId,
    userId: dto.userId,
    username: dto.username,
    userFullName: dto.userFullName,
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    serviceType: dto.serviceType,
    method: dto.method,
    status: dto.status,
    scheduledTime: dto.scheduledTime,
    notes: dto.notes,
    createTime: dto.createTime,
    updateTime: dto.updateTime,
  }
}

const serviceAppointmentService = {
  async createAppointment(payload) {
    const response = await request({
      url: '/service-appointments',
      method: 'POST',
      data: payload,
      auth: true,
    })

    return mapAppointment(response)
  },

  async getMyAppointments(page, size) {
    const response = await request({
      url: '/service-appointments/me',
      query: {
        page: page || 0,
        size: size || 50,
      },
      auth: true,
    })

    return {
      ...response,
      content: (response.content || []).map(mapAppointment),
    }
  },

  cancelAppointment(appointmentId) {
    return request({
      url: `/service-appointments/${appointmentId}/cancel`,
      method: 'PUT',
      auth: true,
    })
  },
}

module.exports = {
  serviceAppointmentService,
}
