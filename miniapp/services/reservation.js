const { request } = require('../utils/request')

function mapReservation(dto) {
  return {
    reservationId: dto.reservationId,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    coverUrl: dto.coverUrl,
    status: dto.status,
    queuePosition: dto.queuePosition,
    reservationDate: String(dto.reservationDate || '').slice(0, 10),
    expiryDate: dto.expiryDate ? String(dto.expiryDate).slice(0, 10) : undefined,
  }
}

const reservationService = {
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

  async getMyReservations() {
    const response = await this.getMyReservationsPage(0, 100)

    return response.items
  },

  createReservation(bookId) {
    return request({
      url: '/reservations',
      method: 'POST',
      data: { bookId },
      auth: true,
    })
  },

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
