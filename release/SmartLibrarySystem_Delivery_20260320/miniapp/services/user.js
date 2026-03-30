const { request } = require('../utils/request')

function mapOverview(dto) {
  return {
    userId: dto.userId,
    username: dto.username,
    fullName: dto.fullName,
    activeLoanCount: dto.activeLoanCount || 0,
    dueSoonLoanCount: dto.dueSoonLoanCount || 0,
    dueSoonLoans: (dto.dueSoonLoans || []).map((loan) => ({
      loanId: loan.loanId,
      bookId: loan.bookId,
      bookTitle: loan.bookTitle,
      dueDate: String(loan.dueDate || '').slice(0, 10),
      daysRemaining: loan.daysRemaining || 0,
      status: loan.status,
    })),
    activeReservationCount: dto.activeReservationCount || 0,
    readyReservationCount: dto.readyReservationCount || 0,
    pendingFineCount: dto.pendingFineCount || 0,
    pendingFineTotal: Number(dto.pendingFineTotal || 0),
    unreadNotificationCount: dto.unreadNotificationCount || 0,
    favoriteCount: dto.favoriteCount || 0,
    pendingServiceAppointmentCount: dto.pendingServiceAppointmentCount || 0,
    completedServiceAppointmentCount: dto.completedServiceAppointmentCount || 0,
  }
}

const userService = {
  getMyProfile() {
    return request({
      url: '/users/me/profile',
      auth: true,
    })
  },

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
