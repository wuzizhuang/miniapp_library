const { request } = require('../utils/request')

function mapSeat(dto) {
  return {
    seatId: dto.seatId,
    seatCode: dto.seatCode,
    floorName: dto.floorName,
    floorOrder: dto.floorOrder,
    zoneName: dto.zoneName,
    areaName: dto.areaName,
    seatType: dto.seatType,
    status: dto.status,
    hasPower: Boolean(dto.hasPower),
    nearWindow: Boolean(dto.nearWindow),
    description: dto.description,
    available: Boolean(dto.available),
  }
}

function mapReservation(dto) {
  return {
    reservationId: dto.reservationId,
    userId: dto.userId,
    username: dto.username,
    userFullName: dto.userFullName,
    seatId: dto.seatId,
    seatCode: dto.seatCode,
    floorName: dto.floorName,
    zoneName: dto.zoneName,
    areaName: dto.areaName,
    seatType: dto.seatType,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: dto.status,
    notes: dto.notes,
    createTime: dto.createTime,
    updateTime: dto.updateTime,
  }
}

const seatReservationService = {
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

  async createReservation(payload) {
    const response = await request({
      url: '/seat-reservations',
      method: 'POST',
      data: payload,
      auth: true,
    })

    return mapReservation(response)
  },

  async getMyReservations() {
    const response = await request({
      url: '/seat-reservations/me',
      auth: true,
    })

    return (response || []).map(mapReservation)
  },

  cancelReservation(reservationId) {
    return request({
      url: `/seat-reservations/${reservationId}/cancel`,
      method: 'PUT',
      auth: true,
    })
  },
}

module.exports = {
  seatReservationService,
}
