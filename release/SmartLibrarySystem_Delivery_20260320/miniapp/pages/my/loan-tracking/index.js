const { libraryService } = require('../../../services/library')

function decorateLoan(loan) {
  if (!loan) {
    return null
  }

  return {
    ...loan,
    statusLabel:
      loan.status === 'BORROWED'
        ? '借阅中'
        : loan.status === 'OVERDUE'
          ? '已逾期'
          : '已归还',
    statusClass:
      loan.status === 'BORROWED'
        ? 'chip-warning'
        : loan.status === 'OVERDUE'
          ? 'chip-danger'
          : 'chip-success',
  }
}

Page({
  data: {
    loanId: '',
    loan: null,
    loading: true,
    actionLoading: false,
    errorMessage: '',
  },

  onLoad(options) {
    this.setData({
      loanId: options.loanId || '',
    })
  },

  onShow() {
    this.loadLoan()
  },

  async loadLoan() {
    if (!this.data.loanId) {
      this.setData({
        loading: false,
        errorMessage: '缺少借阅记录 ID',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const loan = await libraryService.getLoanById(this.data.loanId)
      this.setData({
        loan: decorateLoan(loan),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '借阅追踪加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  async renewLoan() {
    this.setData({
      actionLoading: true,
    })

    try {
      await libraryService.renewLoan(this.data.loanId)
      wx.showToast({
        title: '续借成功',
        icon: 'success',
      })
      await this.loadLoan()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '续借失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionLoading: false,
      })
    }
  },

  async returnLoan() {
    this.setData({
      actionLoading: true,
    })

    try {
      await libraryService.returnLoan(this.data.loanId)
      wx.showToast({
        title: '归还成功',
        icon: 'success',
      })
      await this.loadLoan()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '归还失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionLoading: false,
      })
    }
  },
})
