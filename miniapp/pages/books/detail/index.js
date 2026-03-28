/**
 * @file 图书详情页面逻辑
 * @description 展示单本图书的完整信息，功能：
 *   - 图书基本信息（书名/作者/出版社/ISBN 等）
 *   - 馆藏位置（可用副本列表）
 *   - 用户操作：收藏/取消收藏、借阅、预约排队
 *   - 图书评价列表 + 发表新评价
 *   - 查看/跳转到关联借阅记录、预约记录
 *   - 复制线上资源链接
 */

const { libraryService } = require('../../../services/library')
const { REVIEW_COMMENT_MAX_LENGTH } = require('../../../constants/review')
const { confirmAction } = require('../../../utils/interaction')

/**
 * 装饰评价对象，补充展示字段
 * @param {Object} review - 原始评价数据
 * @returns {Object} 含 ratingText / createDate 的装饰对象
 */
function reviewDecorator(review) {
  return {
    ...review,
    ratingText: `${review.rating || 0} / 5`,
    createDate: String(review.createTime || '').slice(0, 10),
  }
}

/** 资源模式枚举值映射为中文 */
const RESOURCE_MODE_MAP = {
  PHYSICAL: '实体图书',
  DIGITAL: '电子资源',
  HYBRID: '实体+电子',
}

function friendlyResourceMode(value) {
  return RESOURCE_MODE_MAP[value] || value || '未知'
}

Page({
  /**
   * 页面数据
   * @property {string} bookId       - 当前图书 ID
   * @property {Object|null} detail  - 图书详情视图模型
   * @property {boolean} loading     - 数据加载中
   * @property {boolean} actionLoading - 操作（借阅/收藏等）进行中
   * @property {string} errorMessage - 错误信息
   * @property {string} reviewContent - 评价内容输入值
   * @property {number} reviewRating  - 评分选择（1-5）
   * @property {number[]} ratingOptions - 可选评分列表
   */
  data: {
    bookId: '',
    detail: null,
    loading: true,
    actionLoading: false,
    errorMessage: '',
    reviewContent: '',
    reviewRating: 5,
    ratingOptions: [5, 4, 3, 2, 1],
    maxLength: REVIEW_COMMENT_MAX_LENGTH,
  },

  /** 页面加载，从路由参数获取图书 ID */
  onLoad(options) {
    this.setData({
      bookId: options.bookId || '',
    })
  },

  /** 每次显示页面时重新加载详情（确保数据最新） */
  onShow() {
    this.loadDetail()
  },

  /**
   * 加载图书详情
   * 调用 libraryService.getBookDetail，返回：
   *   - book: 图书基本信息
   *   - reviews: 评价列表
   *   - isFavorite: 是否已收藏
   *   - availableLocations: 可用馆藏位置
   *   - activeLoan: 当前活跃借阅
   *   - activeReservation: 当前活跃预约
   */
  async loadDetail() {
    if (!this.data.bookId) {
      this.setData({
        loading: false,
        errorMessage: '缺少图书 ID',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const detail = await libraryService.getBookDetail(this.data.bookId)

      this.setData({
        detail: {
          ...detail,
          book: {
            ...detail.book,
            resourceMode: friendlyResourceMode(detail.book.resourceMode),
          },
          reviews: (detail.reviews || []).map(reviewDecorator),
        },
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '图书详情加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  /** 评价内容输入事件 */
  onReviewInput(event) {
    this.setData({
      reviewContent: event.detail.value,
    })
  },

  /** 选择评分 */
  pickRating(event) {
    this.setData({
      reviewRating: Number(event.currentTarget.dataset.rating || 5),
    })
  },

  /**
   * 通用操作执行器
   * 统一处理 loading 状态 → 执行 → 成功提示 → 刷新详情 → 失败提示
   * @param {Function} handler - 异步操作函数
   * @param {string} successText - 成功提示文案
   */
  async runAction(handler, successText) {
    if (this.data.actionLoading) {
      return false
    }

    this.setData({
      actionLoading: true,
    })

    try {
      await handler()
      wx.showToast({
        title: successText,
        icon: 'success',
      })
      await this.loadDetail()
      return true
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败',
        icon: 'none',
      })
      return false
    } finally {
      this.setData({
        actionLoading: false,
      })
    }
  },

  /** 切换收藏状态 */
  toggleFavorite() {
    if (this.data.actionLoading) {
      return
    }

    void this.runAction(() => libraryService.toggleFavorite(this.data.bookId), '收藏状态已更新')
  },

  /** 借阅图书（自动查找可用副本） */
  async borrowBook() {
    if (this.data.actionLoading) {
      return
    }

    if (this.data.detail && this.data.detail.activeLoan) {
      wx.showToast({
        title: '你已借阅本书，请勿重复借阅',
        icon: 'none',
      })
      return
    }

    if (Number(this.data.detail && this.data.detail.book && this.data.detail.book.availableCount) <= 0) {
      wx.showToast({
        title: '当前没有可借副本，请先预约',
        icon: 'none',
      })
      return
    }

    const confirmed = await confirmAction({
      title: '确认借阅',
      content: `确认借阅《${(this.data.detail && this.data.detail.book && this.data.detail.book.title) || '当前图书'}》吗？`,
      confirmText: '立即借阅',
    })

    if (!confirmed) {
      return
    }

    void this.runAction(() => libraryService.borrowBook(this.data.bookId), '借阅成功')
  },

  /** 预约排队 */
  async reserveBook() {
    if (this.data.actionLoading) {
      return
    }

    if (this.data.detail && this.data.detail.activeLoan) {
      wx.showToast({
        title: '你已借阅本书，无需重复预约',
        icon: 'none',
      })
      return
    }

    if (this.data.detail && this.data.detail.activeReservation) {
      wx.showToast({
        title: '你已预约本书，请前往预约页查看',
        icon: 'none',
      })
      return
    }

    const confirmed = await confirmAction({
      title: '确认预约',
      content: `确认预约《${(this.data.detail && this.data.detail.book && this.data.detail.book.title) || '当前图书'}》吗？到馆后会通知你。`,
      confirmText: '确认预约',
    })

    if (!confirmed) {
      return
    }

    void this.runAction(() => libraryService.reserveBook(this.data.bookId), '预约成功')
  },

  /**
   * 提交图书评价
   * 校验评论内容非空后提交，成功后清空输入
   */
  async submitReview() {
    if (this.data.actionLoading) {
      return
    }

    const commentText = String(this.data.reviewContent || '').trim()

    if (!commentText) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none',
      })
      return
    }

    if (commentText.length > REVIEW_COMMENT_MAX_LENGTH) {
      wx.showToast({
        title: `评论不能超过 ${REVIEW_COMMENT_MAX_LENGTH} 字`,
        icon: 'none',
      })
      return
    }

    const isSuccess = await this.runAction(
      () =>
        libraryService.submitReview(this.data.bookId, {
          rating: this.data.reviewRating,
          commentText,
        }),
      '评论已提交',
    )

    if (isSuccess) {
      // 提交成功后清空输入
      this.setData({
        reviewContent: '',
        reviewRating: 5,
      })
    }
  },

  /** 复制线上资源链接到剪贴板 */
  copyOnlineAccess() {
    const url = this.data.detail && this.data.detail.book ? this.data.detail.book.onlineAccessUrl : ''

    if (!url) {
      wx.showToast({
        title: '当前没有线上资源',
        icon: 'none',
      })
      return
    }

    wx.setClipboardData({
      data: url,
    })
  },

  /** 跳转到借阅追踪页（查看当前活跃借阅详情） */
  goLoanTracking() {
    const loanId = this.data.detail && this.data.detail.activeLoan ? this.data.detail.activeLoan.loanId : ''

    if (!loanId) {
      return
    }

    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${loanId}`,
    })
  },

  /** 跳转到我的预约列表页 */
  goReservations() {
    wx.navigateTo({
      url: '/pages/my/reservations/index',
    })
  },

  /** 重试加载图书详情 */
  retryLoadDetail() {
    this.loadDetail()
  },
})
