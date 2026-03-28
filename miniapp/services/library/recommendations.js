/**
 * @file 图书馆服务 — 推荐动态领域
 * @description 创建推荐动态相关的 libraryService 方法：
 *   - getRecommendations     — 获取推荐动态列表
 *   - searchBooks            — 搜索图书（发布推荐时用）
 *   - createRecommendation   — 发布推荐动态
 *   - toggleRecommendationLike   — 切换点赞
 *   - toggleRecommendationFollow — 切换关注
 *   - deleteRecommendation   — 删除推荐动态
 */

/**
 * 创建推荐动态领域服务
 * @param {Object} deps - 依赖注入
 * @returns {Object} 推荐动态方法集合
 */
function createRecommendationLibraryService(deps) {
  const { bookService, recommendationService, extractPageContent } = deps

  /**
   * 根据 postId 从信息流中查找单条推荐动态
   * 由于没有单独的"获取单条动态"接口，所以拉取全量后过滤
   * @param {number} postId - 动态 ID
   * @returns {Promise<Object|null>} 动态对象，或 null
   */
  async function getRecommendationById(postId) {
    const response = await recommendationService.getFeed('all', 0, 100)
    return extractPageContent(response).find((item) => item.postId === Number(postId)) || null
  }

  return {
    /**
     * 获取推荐动态列表
     * @param {string} [scope='all'] - all / following
     */
    async getRecommendations(scope) {
      const response = await recommendationService.getFeed(scope || 'all', 0, 50)
      return extractPageContent(response)
    },

    /**
     * 搜索图书（发布推荐时选择要推荐的书）
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Object[]>} 图书列表（最多 6 本）
     */
    searchBooks(keyword) {
      return bookService.getBooks({
        keyword: String(keyword || '').trim(),
        page: 0, size: 6,
      })
    },

    /**
     * 发布推荐动态
     * @param {Object} payload - { bookId, content }
     */
    createRecommendation(payload) {
      return recommendationService.createPost({
        bookId: Number(payload.bookId),
        content: String(payload.content || '').trim(),
      })
    },

    /**
     * 切换点赞状态
     * @param {number} postId - 动态 ID
     * @returns {Promise<boolean>} 操作后的点赞状态
     */
    async toggleRecommendationLike(postId) {
      const post = await getRecommendationById(postId)
      if (!post) throw new Error('推荐动态不存在')

      if (post.likedByMe) {
        await recommendationService.unlikePost(post.postId)
        return false
      }
      await recommendationService.likePost(post.postId)
      return true
    },

    /**
     * 切换关注状态
     * @param {number} postId - 动态 ID
     * @returns {Promise<boolean>} 操作后的关注状态
     */
    async toggleRecommendationFollow(postId) {
      const post = await getRecommendationById(postId)
      if (!post) throw new Error('推荐动态不存在')

      if (post.followingAuthor) {
        await recommendationService.unfollowTeacher(post.authorUserId)
        return false
      }
      await recommendationService.followTeacher(post.authorUserId)
      return true
    },

    /** 删除推荐动态 */
    deleteRecommendation(postId) {
      return recommendationService.deletePost(Number(postId))
    },
  }
}

module.exports = { createRecommendationLibraryService }
