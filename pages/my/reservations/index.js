const { libraryService } = require('../../../services/library')

function decorateReservation(item) {
  const labelMap = {
    PENDING: '排队中',
    AWAITING_PICKUP: '待取书',
    CANCELLED: '已取消',
  }

  const classMap = {
    PENDING: 'chip-warning',
    AWAITING_PICKUP: 'chip-primary',
    CANCELLED: 'chip-danger',
  }

  return {
    ...item,
    statusLabel: labelMap[item.status] || item.status,
    statusClass: classMap[item.status] || 'chip',
  }
}

Page({
  data: {
    items: [],
    loading: true,
    errorMessage: '',
  },

  onShow() {
    this.loadReservations()
  },

  async loadReservations() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getReservations()
      this.setData({
        items: (items || []).map(decorateReservation),
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

  openBook(event) {
    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${event.currentTarget.dataset.bookId}`,
    })
  },
})
