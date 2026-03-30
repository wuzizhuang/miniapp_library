const { request } = require('../utils/request')

const bookCopyService = {
  getByBookId(bookId) {
    return request({
      url: `/books/${bookId}/copies`,
    })
  },
}

module.exports = {
  bookCopyService,
}
