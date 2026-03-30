/**
 * @file 我的预约页面逻辑
 * @description 展示用户的图书预约列表，功能：
 *   - 查看预约状态（排队中/待取书/已取书/已取消/已过期）
 *   - 取消预约
 *   - 跳转到图书详情
 *   - 支持从通知跳转后高亮指定预约项
 */

const { libraryService } = require('../../../services/library')

/**
 * 装饰预约记录，补充状态标签和样式
 * @param {Object} item - 原始预约数据
 * @returns {Object} 含 statusLabel / statusClass 的装饰对象
 */
function decorateReservation(item) {
  /** 预约状态标签映射 */
  const labelMap = {
    PENDING: '排队中',
    AWAITING_PICKUP: '待取书',
    FULFILLED: '已取书',
    CANCELLED: '已取消',
    EXPIRED: '已过期',
  }

  /** 预约状态样式映射 */
  const classMap = {
    PENDING: 'chip-warning',
    AWAITING_PICKUP: 'chip-primary',
    FULFILLED: 'chip-success',
    CANCELLED: 'chip-danger',
    EXPIRED: 'chip-danger',
  }

  return {
    ...item,
    statusLabel: labelMap[item.status] || item.status,
    statusClass: classMap[item.status] || 'chip',
  }
}

Page({
  /**
   * 页面数据
   * @property {Object[]} items      - 预约列表
   * @property {boolean} loading     - 加载中
   * @property {string} errorMessage - 错误信息
   * @property {number} highlightId  - 高亮预约 ID（来自通知跳转）
   * @property {string} highlightAnchor - 高亮锚点
   */
  data: {
    items: [],
    loading: true,
    errorMessage: '',
    highlightId: 0,
    highlightAnchor: '',
  },

  /** 页面加载，从路由参数获取高亮 ID */
  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `reservation-${highlightId}` : '',
    })
  },

  /** 每次显示页面时加载预约列表 */
  onShow() {
    this.loadReservations()
  },

  /** 加载预约列表 */
  async loadReservations() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getReservations()
      this.setData({
        items: (items || []).map((item) => ({
          ...decorateReservation(item),
          isHighlighted: Number(item.reservationId) === Number(this.data.highlightId || 0),
        })),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '预约加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  /**
   * 取消预约
   * @param {Object} event - 事件对象，data-reservation-id 携带预约 ID
   */
  async cancelReservation(event) {
    const reservationId = event.currentTarget.dataset.reservationId

    try {
      await libraryService.cancelReservation(reservationId)
      wx.showToast({
        title: '预约已取消',
        icon: 'success',
      })
      this.loadReservations()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '取消失败',
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
