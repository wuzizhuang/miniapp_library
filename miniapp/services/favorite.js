const { request } = require('../utils/request')

function mapBook(item) {
  return {
    bookId: item.bookId,
    isbn: item.isbn || '',
    title: item.title,
    coverUrl: item.coverUrl,
    resourceMode: item.resourceMode,
    onlineAccessUrl: item.onlineAccessUrl,
    onlineAccessType: item.onlineAccessType,
    description: item.description,
    language: item.language,
    publishYear: item.publishedYear,
    publisherName: item.publisherName,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryNames: item.categoryName ? [item.categoryName] : [],
    authorNames: (item.authors || []).map((author) => author.name),
    inventoryCount: item.totalCopies || item.availableCopies || 0,
    availableCount: item.availableCopies || 0,
    availableCopies: item.availableCopies || 0,
    totalCopies: item.totalCopies || item.availableCopies || 0,
    avgRating: item.avgRating,
    reviewCount: item.reviewCount,
  }
}

const favoriteService = {
  async getMyFavorites(page, size) {
    const response = await request({
      url: '/user-favorites',
      query: {
        page: page || 0,
        size: size || 100,
      },
      auth: true,
    })

    return (response.content || []).map(mapBook)
  },

  checkFavorite(bookId) {
    return request({
      url: `/user-favorites/${bookId}/check`,
      auth: true,
    }).then((value) => Boolean(value))
  },

  addFavorite(bookId) {
    return request({
      url: `/user-favorites/${bookId}`,
      method: 'POST',
      auth: true,
    })
  },

  removeFavorite(bookId) {
    return request({
      url: `/user-favorites/${bookId}`,
      method: 'DELETE',
      auth: true,
    })
  },
}

module.exports = {
  favoriteService,
}
