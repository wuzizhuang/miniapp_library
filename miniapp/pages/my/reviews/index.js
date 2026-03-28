/**
 * @file 我的评论页面逻辑
 * @description 管理用户提交的图书评价（书评），功能：
 *   - 查看评论列表（含审核状态：待审核/已通过/已驳回）
 *   - 编辑评论（修改评分和评论内容）
 *   - 删除评论（需二次确认）
 *   - 跳转到关联图书详情页
 */

const { libraryService } = require('../../../services/library')
const { REVIEW_COMMENT_MAX_LENGTH } = require('../../../constants/review')
const { confirmAction } = require('../../../utils/interaction')

/** 评分选项列表（5 → 1） */
const RATING_OPTIONS = [5, 4, 3, 2, 1]

/**
 * 装饰评论数据，补充审核状态标签和展示格式
 * @param {Object} item - 原始评论数据
 * @returns {Object} 含 statusLabel / statusClass / createDate / ratingText 的装饰对象
 */
function decorateReview(item) {
  /** 审核状态文案映射 */
  const statusMap = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
  }

  /** 审核状态样式映射 */
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
  /**
   * 页面数据
   * @property {Object[]} items          - 评论列表
   * @property {boolean} loading         - 加载中
   * @property {string} errorMessage     - 错误信息
   * @property {number[]} ratingOptions  - 评分选项
   * @property {number} editingReviewId  - 正在编辑的评论 ID（0 表示未编辑）
   * @property {number} editRating       - 编辑中的评分值
   * @property {string} editCommentText  - 编辑中的评论内容
   * @property {number} submittingReviewId - 正在提交更新的评论 ID
   * @property {number} deletingReviewId   - 正在删除的评论 ID
   */
  data: {
    items: [],
    loading: true,
    errorMessage: '',
    ratingOptions: RATING_OPTIONS,
    editingReviewId: 0,
    editRating: 5,
    editCommentText: '',
    submittingReviewId: 0,
    deletingReviewId: 0,
  },

  /** 每次显示页面时加载评论列表 */
  onShow() {
    this.loadReviews()
  },

  /** 加载我的评论列表 */
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

  /**
   * 开始编辑评论
   * 将选中评论的数据填充到编辑表单
   */
  startEdit(event) {
    const reviewId = Number(event.currentTarget.dataset.reviewId || 0)
    const review = (this.data.items || []).find((item) => item.reviewId === reviewId)

    if (!review) {
      return
    }

    this.setData({
      editingReviewId: review.reviewId,
      editRating: Number(review.rating || 5),
      editCommentText: review.commentText || '',
    })
  },

  /** 取消编辑，清空编辑表单 */
  cancelEdit() {
    this.setData({
      editingReviewId: 0,
      editRating: 5,
      editCommentText: '',
    })
  },

  /** 选择评分 */
  pickRating(event) {
    this.setData({
      editRating: Number(event.currentTarget.dataset.rating || 5),
    })
  },

  /** 评论内容输入事件 */
  onCommentInput(event) {
    this.setData({
      editCommentText: event.detail.value,
    })
  },

  /**
   * 提交编辑
   * 校验评分 > 0 → 调用 updateReview → 成功后关闭编辑 → 刷新列表
   */
  async submitEdit() {
    if (!this.data.editingReviewId || this.data.submittingReviewId || this.data.deletingReviewId) {
      return
    }

    if (this.data.editRating <= 0) {
      wx.showToast({
        title: '请选择评分',
        icon: 'none',
      })
      return
    }

    if (String(this.data.editCommentText || '').trim().length > REVIEW_COMMENT_MAX_LENGTH) {
      wx.showToast({
        title: `评论不能超过 ${REVIEW_COMMENT_MAX_LENGTH} 字`,
        icon: 'none',
      })
      return
    }

    this.setData({
      submittingReviewId: this.data.editingReviewId,
    })

    try {
      await libraryService.updateReview(this.data.editingReviewId, {
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

  /**
   * 删除评论
   * 弹出二次确认对话框，确认后执行删除
   * 如果删除的是正在编辑的评论，同时关闭编辑表单
   */
  async deleteReview(event) {
    const reviewId = Number(event.currentTarget.dataset.reviewId || 0)

    if (!reviewId || this.data.submittingReviewId || this.data.deletingReviewId) {
      return
    }

    const confirmed = await confirmAction({
      title: '删除评论',
      content: '确认删除这条评论吗？删除后无法恢复。',
      confirmText: '确认删除',
    })

    if (!confirmed) {
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
      // 如果删除的是正在编辑的评论，关闭编辑表单
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

  /** 跳转到图书详情页 */
  openBook(event) {
    const bookId = Number(event.currentTarget.dataset.bookId || 0)

    if (!bookId) {
      return
    }

    wx.navigateTo({
      url: `/pages/books/detail/index?bookId=${bookId}`,
    })
  },

  /** 跳转到图书目录页 */
  goCatalog() {
    wx.switchTab({
      url: '/pages/books/index',
    })
  },

  /** 重试加载 */
  retryLoadReviews() {
    this.loadReviews()
  },
})
