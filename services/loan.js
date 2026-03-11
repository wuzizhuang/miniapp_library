const { request } = require('../utils/request')

function mapLoanStatus(status) {
  if (status === 'ACTIVE') {
    return 'BORROWED'
  }

  return status
}

function mapLoan(dto) {
  return {
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    bookCover: dto.bookCoverUrl,
    bookAuthorNames: dto.bookAuthorNames,
    categoryName: dto.categoryName,
    locationCode: dto.locationCode,
    borrowDate: String(dto.borrowDate || '').slice(0, 10),
    dueDate: String(dto.dueDate || '').slice(0, 10),
    returnDate: dto.returnDate ? String(dto.returnDate).slice(0, 10) : undefined,
    status: mapLoanStatus(dto.status),
    daysOverdue: dto.daysOverdue,
    daysRemaining: dto.daysRemaining,
    renewalCount: dto.renewalCount || 0,
    canRenew: (dto.renewalCount || 0) < 2 && dto.status === 'ACTIVE',
    copyId: dto.copyId,
    bookId: dto.bookId,
  }
}

const loanService = {
  async getMyLoans() {
    const response = await request({
      url: '/loans/my',
      query: { page: 0, size: 50 },
      auth: true,
    })

    return (response.content || []).map(mapLoan)
  },

  async getMyLoanHistory() {
    const response = await request({
      url: '/loans/history',
      query: { page: 0, size: 100 },
      auth: true,
    })

    return (response.content || []).map(mapLoan)
  },

  async getLoanById(loanId) {
    const response = await request({
      url: `/loans/${loanId}`,
      auth: true,
    })

    return mapLoan(response)
  },

  createLoan(copyId) {
    return request({
      url: '/loans',
      method: 'POST',
      data: { copyId },
      auth: true,
    })
  },

  renewLoan(loanId) {
    return request({
      url: `/loans/${loanId}/renew`,
      method: 'PUT',
      auth: true,
    })
  },

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
