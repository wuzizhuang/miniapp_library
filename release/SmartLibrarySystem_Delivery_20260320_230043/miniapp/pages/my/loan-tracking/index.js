/**
 * @file 借阅追踪页面逻辑
 * @description 展示单笔借阅的详细信息，功能：
 *   - 查看借阅状态（借阅中/已逾期/已归还）
 *   - 续借操作
 *   - 归还操作
 */

const { libraryService } = require('../../../services/library')

/**
 * 装饰借阅记录，补充状态标签和样式
 * @param {Object} loan - 原始借阅数据
 * @returns {Object|null} 装饰后的借阅记录
 */
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
  /**
   * 页面数据
   * @property {string} loanId       - 借阅记录 ID
   * @property {Object|null} loan    - 借阅详情（装饰后）
   * @property {boolean} loading     - 数据加载中
   * @property {boolean} actionLoading - 操作（续借/归还）进行中
   * @property {string} errorMessage - 错误信息
   */
  data: {
    loanId: '',
    loan: null,
    loading: true,
    actionLoading: false,
    errorMessage: '',
  },

  /** 页面加载，从路由参数获取借阅 ID */
  onLoad(options) {
    this.setData({
      loanId: options.loanId || '',
    })
  },

  /** 每次显示页面时重新加载 */
  onShow() {
    this.loadLoan()
  },

  /** 加载借阅详情 */
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

  /**
   * 续借操作
   * 成功后自动刷新借阅详情（到期日期会延长）
   */
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

  /**
   * 归还操作
   * 成功后自动刷新借阅详情（状态变为已归还）
   */
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
