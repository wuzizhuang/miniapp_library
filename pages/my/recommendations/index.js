const { libraryService } = require('../../../services/library')

const SCOPE_OPTIONS = [
  { value: 'all', label: '全部动态' },
  { value: 'following', label: '关注的人' },
  { value: 'mine', label: '我的发布' },
]

function decoratePost(item) {
  return {
    ...item,
    createDate: String(item.createTime || '').replace('T', ' ').slice(0, 16),
  }
}

Page({
  data: {
    scope: 'all',
    scopeOptions: SCOPE_OPTIONS,
    items: [],
    loading: true,
    submitting: false,
    errorMessage: '',
    bookKeyword: '',
    searchResults: [],
    selectedBook: null,
    content: '',
  },

  onShow() {
    this.loadRecommendations()
  },

  async loadRecommendations() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const scope = this.data.scope === 'all' ? '' : this.data.scope
      const items = await libraryService.getRecommendations(scope)
      this.setData({
        items: (items || []).map(decoratePost),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '推荐动态加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  pickScope(event) {
    this.setData(
      {
        scope: event.currentTarget.dataset.scope,
      },
      () => this.loadRecommendations(),
    )
  },

  async onBookKeywordInput(event) {
    const bookKeyword = event.detail.value

    this.setData({
      bookKeyword,
    })

    if (!String(bookKeyword || '').trim()) {
      this.setData({
        searchResults: [],
      })
      return
    }

    const searchResults = await libraryService.searchBooks(bookKeyword)
    this.setData({
      searchResults,
    })
  },

  selectBook(event) {
    const bookId = Number(event.currentTarget.dataset.bookId || 0)
    const selectedBook = (this.data.searchResults || []).find((book) => book.bookId === bookId) || null

    this.setData({
      selectedBook,
      bookKeyword: selectedBook ? selectedBook.title : '',
      searchResults: [],
    })
  },

  onContentInput(event) {
    this.setData({
      content: event.detail.value,
    })
  },

  async createPost() {
    const content = String(this.data.content || '').trim()

    if (!this.data.selectedBook || !content) {
      wx.showToast({
        title: '请选择图书并填写内容',
        icon: 'none',
      })
      return
    }

    this.setData({
      submitting: true,
    })

    try {
      await libraryService.createRecommendation({
        bookId: this.data.selectedBook.bookId,
        content,
      })

      wx.showToast({
        title: '发布成功',
        icon: 'success',
      })

      this.setData({
        bookKeyword: '',
        selectedBook: null,
        searchResults: [],
        content: '',
        scope: 'mine',
      })

      await this.loadRecommendations()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '发布失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        submitting: false,
      })
    }
  },

  async toggleLike(event) {
    await libraryService.toggleRecommendationLike(event.currentTarget.dataset.postId)
    this.loadRecommendations()
  },

  async toggleFollow(event) {
    await libraryService.toggleRecommendationFollow(event.currentTarget.dataset.postId)
    this.loadRecommendations()
  },

  async deletePost(event) {
    await libraryService.deleteRecommendation(event.currentTarget.dataset.postId)
    this.loadRecommendations()
  },

  openBook(event) {
    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${event.currentTarget.dataset.bookId}`,
    })
  },
})
