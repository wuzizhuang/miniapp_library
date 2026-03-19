const { libraryService } = require('../../../services/library')

const PENDING_BOOK_KEYWORD_STORAGE_KEY = 'miniapp_pending_books_keyword'

function decorateHistory(item) {
  return {
    ...item,
    searchDate: String(item.searchTime || '').replace('T', ' ').slice(0, 16),
    resultLabel: `${Number(item.resultCount || 0)} 条结果`,
  }
}

Page({
  data: {
    loading: true,
    errorMessage: '',
    items: [],
    hotKeywords: [],
    hotKeywordError: '',
  },

  onShow() {
    this.loadPageData()
  },

  async loadPageData() {
    this.setData({
      loading: true,
      errorMessage: '',
      hotKeywordError: '',
    })

    try {
      const [historyResponse, hotKeywords] = await Promise.all([
        libraryService.getSearchHistory(0, 50),
        libraryService.getHotKeywords(10).catch((error) => {
          this.setData({
            hotKeywordError: error && error.message ? error.message : '热门关键词加载失败',
          })

          return []
        }),
      ])

      this.setData({
        items: (historyResponse.content || []).map(decorateHistory),
        hotKeywords: hotKeywords || [],
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '搜索历史加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  applyKeyword(event) {
    const keyword = String(event.currentTarget.dataset.keyword || '').trim()

    if (!keyword) {
      return
    }

    wx.setStorageSync(PENDING_BOOK_KEYWORD_STORAGE_KEY, keyword)
    wx.switchTab({
      url: '/pages/books/index',
    })
  },

  retryLoadPageData() {
    this.loadPageData()
  },
})
