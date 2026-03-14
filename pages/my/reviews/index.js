const { libraryService } = require('../../../services/library')

const RATING_OPTIONS = [5, 4, 3, 2, 1]

function decorateReview(item) {
  const statusMap = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
  }

  const classMap = {
    PENDING: 'chip-warning',
    APPROVED: 'chip-success',
    REJECTED: 'chip-danger',
  }

  return {
    ...item,
    statusLabel: statusMap[item.status] || '待审核',
    statusClass: classMap[item.status] || 'chip-warning',
    createDate: String(item.createTime || '').replace('T', ' ').slice(0, 16),
    ratingText: `${Number(item.rating || 0)} / 5`,
  }
}

Page({
  data: {
    items: [],
    loading: true,
    errorMessage: '',
    ratingOptions: RATING_OPTIONS,
    editingReviewId: 0,
    editingBookId: 0,
    editRating: 5,
    editCommentText: '',
    submittingReviewId: 0,
    deletingReviewId: 0,
  },

  onShow() {
    this.loadReviews()
  },

  async loadReviews() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const response = await libraryService.getMyReviews(0, 50)
      this.setData({
        items: (response.content || []).map(decorateReview),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '评论加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  startEdit(event) {
    const reviewId = Number(event.currentTarget.dataset.reviewId || 0)
    const review = (this.data.items || []).find((item) => item.reviewId === reviewId)

    if (!review) {
      return
    }

    this.setData({
      editingReviewId: review.reviewId,
      editingBookId: Number(review.bookId || 0),
      editRating: Number(review.rating || 5),
      editCommentText: review.commentText || '',
    })
  },

  cancelEdit() {
    this.setData({
      editingReviewId: 0,
      editingBookId: 0,
      editRating: 5,
      editCommentText: '',
    })
  },

  pickRating(event) {
    this.setData({
      editRating: Number(event.currentTarget.dataset.rating || 5),
    })
  },

  onCommentInput(event) {
    this.setData({
      editCommentText: event.detail.value,
    })
  },

  async submitEdit() {
    if (!this.data.editingReviewId || !this.data.editingBookId) {
      return
    }

    if (this.data.editRating <= 0) {
      wx.showToast({
        title: '请选择评分',
        icon: 'none',
      })
      return
    }

    this.setData({
      submittingReviewId: this.data.editingReviewId,
    })

    try {
      await libraryService.updateReview(this.data.editingReviewId, {
        bookId: this.data.editingBookId,
        rating: this.data.editRating,
        commentText: this.data.editCommentText,
      })
      wx.showToast({
        title: '评论已更新',
        icon: 'success',
      })
      this.cancelEdit()
      await this.loadReviews()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '更新失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        submittingReviewId: 0,
      })
    }
  },

  deleteReview(event) {
    const reviewId = Number(event.currentTarget.dataset.reviewId || 0)

    if (!reviewId) {
      return
    }

    wx.showModal({
      title: '删除评论',
      content: '确认删除这条评论吗？删除后无法恢复。',
      success: async (result) => {
        if (!result.confirm) {
          return
        }

        this.setData({
          deletingReviewId: reviewId,
        })

        try {
          await libraryService.deleteReview(reviewId)
          wx.showToast({
            title: '评论已删除',
            icon: 'success',
          })
          if (this.data.editingReviewId === reviewId) {
            this.cancelEdit()
          }
          await this.loadReviews()
        } catch (error) {
          wx.showToast({
            title: error && error.message ? error.message : '删除失败',
            icon: 'none',
          })
        } finally {
          this.setData({
            deletingReviewId: 0,
          })
        }
      },
    })
  },

  openBook(event) {
    const bookId = Number(event.currentTarget.dataset.bookId || 0)

    if (!bookId) {
      return
    }

    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${bookId}`,
    })
  },

  goCatalog() {
    wx.switchTab({
      url: '/pages/books/index',
    })
  },

  retryLoadReviews() {
    this.loadReviews()
  },
})
