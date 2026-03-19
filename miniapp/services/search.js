const { request } = require('../utils/request')

const searchService = {
  getHotKeywords(limit) {
    return request({
      url: '/search/hot',
      query: { limit: limit || 8 },
    })
  },

  getSuggestions(keyword, limit) {
    const normalizedKeyword = String(keyword || '').trim()

    if (!normalizedKeyword) {
      return Promise.resolve([])
    }

    return request({
      url: '/search/suggestions',
      query: {
        keyword: normalizedKeyword,
        limit: limit || 8,
      },
    })
  },

  getMyHistory(page, size) {
    return request({
      url: '/search/history',
      query: {
        page: page || 0,
        size: size || 20,
      },
      auth: true,
    })
  },
}

module.exports = {
  searchService,
}
