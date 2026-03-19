const { libraryService } = require('../../../services/library')

function reviewDecorator(review) {
  return {
    ...review,
    ratingText: `${review.rating || 0} / 5`,
    createDate: String(review.createTime || '').slice(0, 10),
  }
}

Page({
  data: {
    bookId: '',
    detail: null,
    loading: true,
    actionLoading: false,
    errorMessage: '',
    reviewContent: '',
    reviewRating: 5,
    ratingOptions: [5, 4, 3, 2, 1],
  },

  onLoad(options) {
    this.setData({
      bookId: options.bookId || '',
    })
  },

  onShow() {
    this.loadDetail()
  },

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

  onReviewInput(event) {
    this.setData({
      reviewContent: event.detail.value,
    })
  },

  pickRating(event) {
    this.setData({
      reviewRating: Number(event.currentTarget.dataset.rating || 5),
    })
  },

  async runAction(handler, successText) {
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
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        actionLoading: false,
      })
    }
  },

  toggleFavorite() {
    this.runAction(() => libraryService.toggleFavorite(this.data.bookId), '收藏状态已更新')
  },

  borrowBook() {
    this.runAction(() => libraryService.borrowBook(this.data.bookId), '借阅成功')
  },

  reserveBook() {
    this.runAction(() => libraryService.reserveBook(this.data.bookId), '预约成功')
  },

  async submitReview() {
    const commentText = String(this.data.reviewContent || '').trim()

    if (!commentText) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none',
      })
      return
    }

    await this.runAction(
      () =>
        libraryService.submitReview(this.data.bookId, {
          rating: this.data.reviewRating,
          commentText,
        }),
      '评论已提交',
    )

    this.setData({
      reviewContent: '',
      reviewRating: 5,
    })
  },

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

  goLoanTracking() {
    const loanId = this.data.detail && this.data.detail.activeLoan ? this.data.detail.activeLoan.loanId : ''

    if (!loanId) {
      return
    }

    wx.navigateTo({
      url: `/pages/my/loan-tracking/index?loanId=${loanId}`,
    })
  },

  goReservations() {
    wx.navigateTo({
      url: '/pages/my/reservations/index',
    })
  },
})
