function createRecommendationLibraryService(deps) {
  const {
    bookService,
    recommendationService,
    extractPageContent,
  } = deps

  async function getRecommendationById(postId) {
    const response = await recommendationService.getFeed('all', 0, 100)
    return extractPageContent(response).find((item) => item.postId === Number(postId)) || null
  }

  return {
    async getRecommendations(scope) {
      const response = await recommendationService.getFeed(scope || 'all', 0, 50)
      return extractPageContent(response)
    },

    searchBooks(keyword) {
      return bookService.getBooks({
        keyword: String(keyword || '').trim(),
        page: 0,
        size: 6,
      })
    },

    createRecommendation(payload) {
      return recommendationService.createPost({
        bookId: Number(payload.bookId),
        content: String(payload.content || '').trim(),
      })
    },

    async toggleRecommendationLike(postId) {
      const post = await getRecommendationById(postId)

      if (!post) {
        throw new Error('推荐动态不存在')
      }

      if (post.likedByMe) {
        await recommendationService.unlikePost(post.postId)
        return false
      }

      await recommendationService.likePost(post.postId)
      return true
    },

    async toggleRecommendationFollow(postId) {
      const post = await getRecommendationById(postId)

      if (!post) {
        throw new Error('推荐动态不存在')
      }

      if (post.followingAuthor) {
        await recommendationService.unfollowTeacher(post.authorUserId)
        return false
      }

      await recommendationService.followTeacher(post.authorUserId)
      return true
    },

    deleteRecommendation(postId) {
      return recommendationService.deletePost(Number(postId))
    },
  }
}

module.exports = {
  createRecommendationLibraryService,
}
