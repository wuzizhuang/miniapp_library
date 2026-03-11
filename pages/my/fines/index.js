const { libraryService } = require('../../../services/library')

function decorateFine(item) {
  return {
    ...item,
    statusLabel: item.status === 'PENDING' ? '待支付' : '已支付',
    statusClass: item.status === 'PENDING' ? 'chip-danger' : 'chip-success',
  }
}

Page({
  data: {
    items: [],
    totalPendingAmount: '0.00',
    loading: true,
    errorMessage: '',
  },

  onShow() {
    this.loadFines()
  },

  async loadFines() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getFines()
      const decorated = (items || []).map(decorateFine)
      const totalPendingAmount = decorated
        .filter((item) => item.status === 'PENDING')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
        .toFixed(2)

      this.setData({
        items: decorated,
        totalPendingAmount,
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '罚款加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  async payFine(event) {
    const fineId = event.currentTarget.dataset.fineId

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
    }
  },
})
