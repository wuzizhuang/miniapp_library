const { request } = require('../utils/request')

function mapFine(dto) {
  return {
    fineId: dto.fineId,
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    amount: dto.amount,
    status: dto.status,
    type: dto.type,
    reason: dto.reason,
    createTime: String(dto.dateIssued || '').slice(0, 10),
    paidTime: dto.datePaid ? String(dto.datePaid).slice(0, 10) : undefined,
  }
}

const fineService = {
  async getMyFinesPage(page, size) {
    const response = await request({
      url: '/fines/me',
      query: {
        page: page || 0,
        size: size || 10,
      },
      auth: true,
    })

    return {
      items: (response.content || []).map(mapFine),
      totalPages: Math.max(1, response.totalPages || 1),
      totalElements: response.totalElements || 0,
      page: response.number || 0,
      size: response.size || size || 10,
    }
  },

  async getMyFines() {
    const response = await this.getMyFinesPage(0, 100)

    return response.items
  },

  payFine(fineId) {
    return request({
      url: `/fines/${fineId}/pay`,
      method: 'POST',
      auth: true,
    })
  },
}

module.exports = {
  fineService,
}
