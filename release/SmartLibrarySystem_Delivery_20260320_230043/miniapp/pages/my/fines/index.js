/**
 * @file 我的罚款页面逻辑
 * @description 展示用户罚款记录，功能：
 *   - 查看罚款列表（待支付/已支付/全部）
 *   - 罚款统计（总数/待支付数/累计待支付金额）
 *   - 在线支付罚款
 *   - 跳转到关联借阅追踪
 *   - 支持从通知跳转后高亮指定罚款项
 */

const { libraryService } = require('../../../services/library')

/**
 * 装饰罚款记录，补充状态标签和金额格式
 * @param {Object} item - 原始罚款数据
 * @returns {Object} 含 statusLabel / statusClass / amountText 的装饰对象
 */
function decorateFine(item) {
  return {
    ...item,
    statusLabel: item.status === 'PENDING' ? '待支付' : '已支付',
    statusClass: item.status === 'PENDING' ? 'chip-danger' : 'chip-success',
    amountText: Number(item.amount || 0).toFixed(2),
  }
}

/**
 * 构建罚款摘要统计
 * @param {Object[]} items - 罚款列表
 * @returns {Object} { totalCount, pendingCount, paidCount, totalPendingAmount }
 */
function buildFineSummary(items) {
  const pendingItems = (items || []).filter((item) => item.status === 'PENDING')

  return {
    totalCount: (items || []).length,
    pendingCount: pendingItems.length,
    paidCount: (items || []).filter((item) => item.status !== 'PENDING').length,
    totalPendingAmount: pendingItems
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
      .toFixed(2),
  }
}

/**
 * 按标签页筛选罚款列表
 * @param {string} section - pending/paid/all
 * @param {Object[]} items - 完整罚款列表
 * @returns {Object[]} 筛选后的列表
 */
function filterFineItems(section, items) {
  if (section === 'paid') {
    return (items || []).filter((item) => item.status !== 'PENDING')
  }

  if (section === 'all') {
    return items || []
  }

  // 默认显示待支付
  return (items || []).filter((item) => item.status === 'PENDING')
}

Page({
  /**
   * 页面数据
   * @property {Object[]} items      - 完整罚款列表（装饰后）
   * @property {string} section      - 当前标签页 (pending/paid/all)
   * @property {Object} summary      - 罚款统计
   * @property {Object[]} visibleItems - 当前标签页筛选后的列表
   * @property {boolean} loading     - 加载中
   * @property {number|null} payingFineId - 正在支付的罚款 ID
   * @property {string} errorMessage - 错误信息
   * @property {number} highlightId  - 高亮罚款 ID（来自通知跳转）
   */
  data: {
    items: [],
    section: 'pending',
    summary: {
      totalCount: 0,
      pendingCount: 0,
      paidCount: 0,
      totalPendingAmount: '0.00',
    },
    visibleItems: [],
    loading: true,
    payingFineId: null,
    errorMessage: '',
    highlightId: 0,
    highlightAnchor: '',
  },

  /** 页面加载，从路由参数获取高亮 ID */
  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `fine-${highlightId}` : '',
    })
  },

  /** 每次显示页面时加载罚款列表 */
  onShow() {
    this.loadFines()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadFines({ stopPullDownRefresh: true })
  },

  /** 加载罚款列表，同时计算统计数据和筛选结果 */
  async loadFines(options) {
    const nextOptions = options || {}

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getFines()
      const decorated = (items || []).map(decorateFine)

      this.setData({
        items: decorated,
        summary: buildFineSummary(decorated),
        visibleItems: filterFineItems(this.data.section, decorated).map((item) => ({
          ...item,
          isHighlighted: Number(item.fineId) === Number(this.data.highlightId || 0),
        })),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '罚款加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })

      if (nextOptions.stopPullDownRefresh) {
        wx.stopPullDownRefresh()
      }
    }
  },

  /** 切换标签页（待支付/已支付/全部） */
  pickSection(event) {
    const section = event.currentTarget.dataset.section

    this.setData({
      section,
      visibleItems: filterFineItems(section, this.data.items).map((item) => ({
        ...item,
        isHighlighted: Number(item.fineId) === Number(this.data.highlightId || 0),
      })),
    })
  },

  /** 重试加载 */
  retryLoadFines() {
    this.loadFines()
  },

  /** 跳转到关联的借阅追踪页 */
  openLoan(event) {
    const loanId = event.currentTarget.dataset.loanId

    if (!loanId) {
      return
    }

    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${loanId}`,
    })
  },

  /**
   * 支付罚款
   * 支付过程中显示加载状态，成功后刷新列表
   */
  async payFine(event) {
    const fineId = event.currentTarget.dataset.fineId

    this.setData({
      payingFineId: fineId,
    })

    try {
      await libraryService.payFine(fineId)
      wx.showToast({
        title: '支付成功',
        icon: 'success',
      })
      this.loadFines()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '支付失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        payingFineId: null,
      })
    }
  },
})
