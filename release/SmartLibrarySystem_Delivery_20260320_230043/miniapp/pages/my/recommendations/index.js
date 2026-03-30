/**
 * @file 推荐动态页面逻辑
 * @description 推荐动态管理页面（类似社交分享），功能：
 *   - 查看推荐动态列表（全部/关注的人/我的发布）
 *   - 发布新推荐动态（搜索选择图书 + 填写推荐内容）
 *   - 点赞 / 取消点赞
 *   - 关注 / 取消关注作者
 *   - 删除自己发布的动态
 *   - 支持从通知跳转后高亮指定动态
 */

const { libraryService } = require('../../../services/library')

/**
 * 动态范围筛选选项
 * all: 全部动态
 * following: 关注的人
 * mine: 我的发布
 */
const SCOPE_OPTIONS = [
  { value: 'all', label: '全部动态' },
  { value: 'following', label: '关注的人' },
  { value: 'mine', label: '我的发布' },
]

/**
 * 装饰动态数据，补充日期格式
 * @param {Object} item - 原始动态数据
 * @returns {Object} 含 createDate 的装饰对象
 */
function decoratePost(item) {
  return {
    ...item,
    createDate: String(item.createTime || '').replace('T', ' ').slice(0, 16),
  }
}

Page({
  /**
   * 页面数据
   * @property {string} scope         - 当前筛选范围 (all/following/mine)
   * @property {Object[]} scopeOptions - 范围选项配置
   * @property {Object[]} items        - 动态列表
   * @property {boolean} loading       - 加载中
   * @property {boolean} submitting    - 发布中
   * @property {string} errorMessage   - 错误信息
   * @property {string} bookKeyword    - 图书搜索关键词
   * @property {Object[]} searchResults - 图书搜索结果
   * @property {Object|null} selectedBook - 已选择的图书
   * @property {string} content        - 推荐内容输入
   * @property {number} highlightId    - 高亮动态 ID
   */
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
    highlightId: 0,
    highlightAnchor: '',
  },

  /** 页面加载，从路由参数获取高亮 ID */
  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `recommendation-${highlightId}` : '',
    })
  },

  /** 每次显示页面时加载动态列表 */
  onShow() {
    this.loadRecommendations()
  },

  /** 加载推荐动态列表 */
  async loadRecommendations() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      // scope 为 'all' 时传空字符串（后端默认全部）
      const scope = this.data.scope === 'all' ? '' : this.data.scope
      const items = await libraryService.getRecommendations(scope)
      this.setData({
        items: (items || []).map((item) => ({
          ...decoratePost(item),
          isHighlighted: Number(item.postId) === Number(this.data.highlightId || 0),
        })),
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

  /** 切换动态范围筛选 */
  pickScope(event) {
    this.setData(
      {
        scope: event.currentTarget.dataset.scope,
      },
      () => this.loadRecommendations(),
    )
  },

  /**
   * 图书搜索输入事件
   * 输入关键词后实时搜索图书（最多返回 6 本）
   */
  async onBookKeywordInput(event) {
    const bookKeyword = event.detail.value

    this.setData({
      bookKeyword,
    })

    // 输入为空时清空搜索结果
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

  /**
   * 选择搜索结果中的图书
   * 选择后清空搜索结果列表，将书名填入搜索框
   */
  selectBook(event) {
    const bookId = Number(event.currentTarget.dataset.bookId || 0)
    const selectedBook = (this.data.searchResults || []).find((book) => book.bookId === bookId) || null

    this.setData({
      selectedBook,
      bookKeyword: selectedBook ? selectedBook.title : '',
      searchResults: [],
    })
  },

  /** 推荐内容输入事件 */
  onContentInput(event) {
    this.setData({
      content: event.detail.value,
    })
  },

  /**
   * 发布推荐动态
   * 校验已选择图书且内容非空 → 发布 → 清空表单 → 切换到"我的发布"
   */
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

      // 清空表单并切换到"我的发布"标签页
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

  /** 切换点赞状态 */
  async toggleLike(event) {
    try {
      await libraryService.toggleRecommendationLike(event.currentTarget.dataset.postId)
      this.loadRecommendations()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败',
        icon: 'none',
      })
    }
  },

  /** 切换关注状态 */
  async toggleFollow(event) {
    try {
      await libraryService.toggleRecommendationFollow(event.currentTarget.dataset.postId)
      this.loadRecommendations()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败',
        icon: 'none',
      })
    }
  },

  /** 删除自己发布的动态 */
  async deletePost(event) {
    try {
      await libraryService.deleteRecommendation(event.currentTarget.dataset.postId)
      this.loadRecommendations()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '删除失败',
        icon: 'none',
      })
    }
  },

  /** 跳转到图书详情页 */
  openBook(event) {
    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${event.currentTarget.dataset.bookId}`,
    })
  },
})
