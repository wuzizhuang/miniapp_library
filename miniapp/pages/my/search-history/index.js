/**
 * @file 搜索历史页面逻辑
 * @description 展示用户的搜索记录和热门关键词，功能：
 *   - 查看搜索历史列表（显示搜索词/结果数/时间）
 *   - 展示热门关键词
 *   - 点击关键词跳转到图书目录页并自动搜索
 *     （通过本地存储传递关键词到 Tab 页）
 */

const { libraryService } = require('../../../services/library')
const { confirmAction } = require('../../../utils/interaction')

/**
 * 跨页面传递搜索关键词的本地存储键名
 * 点击关键词 → 写入存储 → switchTab 到目录页 → 目录页 onShow 读取并搜索
 */
const PENDING_BOOK_KEYWORD_STORAGE_KEY = 'miniapp_pending_books_keyword'

/**
 * 装饰搜索历史记录，补充展示字段
 * @param {Object} item - 原始搜索记录
 * @returns {Object} 含 searchDate / resultLabel 的装饰对象
 */
function decorateHistory(item) {
  return {
    ...item,
    searchDate: String(item.searchTime || '').replace('T', ' ').slice(0, 16),
    resultLabel: `${Number(item.resultCount || 0)} 条结果`,
  }
}

Page({
  /**
   * 页面数据
   * @property {boolean} loading       - 加载中
   * @property {string} errorMessage   - 错误信息
   * @property {Object[]} items        - 搜索历史列表
   * @property {string[]} hotKeywords  - 热门关键词
   * @property {string} hotKeywordError - 热门关键词加载错误信息
   */
  data: {
    loading: true,
    errorMessage: '',
    items: [],
    hotKeywords: [],
    hotKeywordError: '',
  },

  /** 每次显示页面时加载数据 */
  onShow() {
    this.loadPageData()
  },

  /**
   * 加载页面数据
   * 并行请求搜索历史和热门关键词
   */
  async loadPageData() {
    this.setData({
      loading: true,
      errorMessage: '',
      hotKeywordError: '',
    })

    try {
      const [historyResponse, hotKeywords] = await Promise.all([
        libraryService.getSearchHistory(0, 50),
        // 热门关键词加载失败不影响主流程
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

  /**
   * 应用关键词
   * 将关键词写入本地存储，然后切换到图书目录 Tab 页
   * 目录页在 onShow 中读取该值并自动执行搜索
   */
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

  /** 重试加载 */
  retryLoadPageData() {
    this.loadPageData()
  },

  /**
   * 清空搜索历史
   * 弹出二次确认后调用接口删除全部历史记录
   */
  async clearHistory() {
    if (!this.data.items.length) {
      return
    }

    const confirmed = await confirmAction({
      title: '清空搜索历史',
      content: '确认清空所有搜索历史吗？清空后无法恢复。',
      confirmText: '确认清空',
    })

    if (!confirmed) {
      return
    }

    try {
      await libraryService.clearSearchHistory()
      wx.showToast({
        title: '历史已清空',
        icon: 'success',
      })
      this.setData({
        items: [],
      })
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '清空失败',
        icon: 'none',
      })
    }
  },
})
