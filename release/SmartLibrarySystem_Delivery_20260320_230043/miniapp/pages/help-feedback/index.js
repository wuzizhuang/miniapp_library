/**
 * @file 帮助反馈页面逻辑
 * @description 用户反馈管理页面，功能：
 *   - 查看已提交的反馈列表（含状态：已提交/已回复）
 *   - 提交新反馈（选择分类：功能建议/问题反馈/服务投诉）
 *   - 支持从通知跳转后高亮指定反馈项
 */

const { libraryService } = require('../../services/library')

/**
 * 反馈分类选项
 * SUGGESTION: 功能建议
 * BUG: 问题反馈
 * SERVICE: 服务投诉
 */
const CATEGORY_OPTIONS = [
  { value: 'SUGGESTION', label: '功能建议' },
  { value: 'BUG', label: '问题反馈' },
  { value: 'SERVICE', label: '服务投诉' },
]

/**
 * 装饰反馈数据，补充 UI 展示字段
 * @param {Object} item - 原始反馈数据
 * @returns {Object} 含 statusLabel / statusClass / createDate 的装饰对象
 */
function decorateFeedback(item) {
  const statusMap = {
    SUBMITTED: '已提交',
    RESOLVED: '已回复',
  }

  return {
    ...item,
    statusLabel: statusMap[item.status] || item.status,
    statusClass: item.status === 'RESOLVED' ? 'chip-success' : 'chip-warning',
    createDate: String(item.createTime || '').replace('T', ' ').slice(0, 16),
  }
}

Page({
  /**
   * 页面数据
   * @property {Object[]} items       - 反馈列表
   * @property {Object[]} categoryOptions - 分类选项
   * @property {string} category      - 当前选择的分类
   * @property {string} subject       - 主题输入
   * @property {string} content       - 内容输入
   * @property {boolean} loading      - 加载中
   * @property {boolean} submitting   - 提交中
   * @property {string} errorMessage  - 错误信息
   * @property {number} highlightId   - 需要高亮的反馈 ID（来自通知跳转）
   * @property {string} highlightAnchor - 高亮锚点（用于 scroll-into-view）
   */
  data: {
    items: [],
    categoryOptions: CATEGORY_OPTIONS,
    category: 'SUGGESTION',
    subject: '',
    content: '',
    loading: true,
    submitting: false,
    errorMessage: '',
    highlightId: 0,
    highlightAnchor: '',
  },

  /** 页面加载，从路由参数获取高亮 ID */
  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `feedback-${highlightId}` : '',
    })
  },

  /** 每次显示页面时加载反馈列表 */
  onShow() {
    this.loadFeedback()
  },

  /** 加载反馈列表 */
  async loadFeedback() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getFeedback()
      this.setData({
        items: (items || []).map((item) => ({
          ...decorateFeedback(item),
          isHighlighted: Number(item.feedbackId) === Number(this.data.highlightId || 0),
        })),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '反馈加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  /** 选择反馈分类 */
  pickCategory(event) {
    this.setData({
      category: event.currentTarget.dataset.category,
    })
  },

  /** 主题输入事件 */
  onSubjectInput(event) {
    this.setData({
      subject: event.detail.value,
    })
  },

  /** 内容输入事件 */
  onContentInput(event) {
    this.setData({
      content: event.detail.value,
    })
  },

  /**
   * 提交反馈
   * 校验主题和内容非空 → 提交 → 清空输入 → 刷新列表
   */
  async submitFeedback() {
    const subject = String(this.data.subject || '').trim()
    const content = String(this.data.content || '').trim()

    if (!subject || !content) {
      wx.showToast({
        title: '请填写主题和内容',
        icon: 'none',
      })
      return
    }

    this.setData({
      submitting: true,
    })

    try {
      await libraryService.submitFeedback({
        category: this.data.category,
        subject,
        content,
      })

      wx.showToast({
        title: '反馈已提交',
        icon: 'success',
      })

      // 清空输入
      this.setData({
        subject: '',
        content: '',
      })

      // 刷新列表
      await this.loadFeedback()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '提交失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        submitting: false,
      })
    }
  },
})
