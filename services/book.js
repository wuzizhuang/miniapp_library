const { request } = require('../utils/request')

function mapBook(dto) {
  return {
    bookId: dto.bookId,
    isbn: dto.isbn || '',
    title: dto.title,
    coverUrl: dto.coverUrl,
    resourceMode: dto.resourceMode,
    onlineAccessUrl: dto.onlineAccessUrl,
    onlineAccessType: dto.onlineAccessType,
    description: dto.description,
    language: dto.language,
    publishYear: dto.publishedYear,
    publisherName: dto.publisherName,
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    categoryNames: dto.categoryName ? [dto.categoryName] : [],
    authorNames: (dto.authors || []).map((item) => item.name),
    inventoryCount: dto.totalCopies || dto.availableCopies || 0,
    availableCount: dto.availableCopies || 0,
    availableCopies: dto.availableCopies || 0,
    totalCopies: dto.totalCopies || dto.availableCopies || 0,
    avgRating: dto.avgRating,
    reviewCount: dto.reviewCount,
  }
}

const bookService = {
  async getBooks(params) {
    const query = params || {}
    const keyword = query.keyword && String(query.keyword).trim()
    const page = query.page || 0
    const size = query.size || 60

    if (keyword) {
      const response = await request({
        url: '/books/search',
        query: {
          keyword,
          page,
          size,
          categoryId: query.categoryId,
        },
      })

      return (response.content || []).map(mapBook)
    }

    if (query.categoryId) {
      const response = await request({
        url: `/books/category/${query.categoryId}`,
        query: { page, size },
      })

      return (response.content || []).map(mapBook)
    }

    const response = await request({
      url: '/books',
      query: { page, size },
    })

    return (response.content || []).map(mapBook)
  },

  async getBookById(bookId) {
    const response = await request({
      url: `/books/${bookId}`,
    })

    return mapBook(response)
  },

  async getCategories() {
    const response = await request({
      url: '/categories',
      query: { page: 0, size: 100 },
    })

    return response.content || []
  },
}

module.exports = {
  bookService,
}
