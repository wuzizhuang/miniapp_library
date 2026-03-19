const { libraryService } = require('../../../services/library')

function decorateFine(item) {
  return {
    ...item,
    statusLabel: item.status === 'PENDING' ? '待支付' : '已支付',
    statusClass: item.status === 'PENDING' ? 'chip-danger' : 'chip-success',
    amountText: Number(item.amount || 0).toFixed(2),
  }
}

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

function filterFineItems(section, items) {
  if (section === 'paid') {
    return (items || []).filter((item) => item.status !== 'PENDING')
  }

  if (section === 'all') {
    return items || []
  }

  return (items || []).filter((item) => item.status === 'PENDING')
}

Page({
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

  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `fine-${highlightId}` : '',
    })
  },

  onShow() {
    this.loadFines()
  },

  onPullDownRefresh() {
    this.loadFines({ stopPullDownRefresh: true })
  },

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

  retryLoadFines() {
    this.loadFines()
  },

  openLoan(event) {
    const loanId = event.currentTarget.dataset.loanId

    if (!loanId) {
      return
    }

    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${loanId}`,
    })
  },

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
