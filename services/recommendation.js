const { request } = require('../utils/request')

function mapPost(dto) {
  return {
    postId: dto.postId,
    authorUserId: dto.authorUserId,
    authorUsername: dto.authorUsername,
    authorFullName: dto.authorFullName,
    authorIdentityType: dto.authorIdentityType,
    authorDepartment: dto.authorDepartment,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    bookCoverUrl: dto.bookCoverUrl,
    content: dto.content,
    createTime: dto.createTime,
    likeCount: dto.likeCount || 0,
    likedByMe: Boolean(dto.likedByMe),
    followingAuthor: Boolean(dto.followingAuthor),
    canManage: Boolean(dto.canManage),
  }
}

const recommendationService = {
  async getFeed(scope, page, size) {
    const response = await request({
      url: '/recommendations',
      query: {
        scope: scope || 'all',
        page: page || 0,
        size: size || 20,
      },
      auth: true,
    })

    return {
      ...response,
      content: (response.content || []).map(mapPost),
    }
  },

  async createPost(payload) {
    const response = await request({
      url: '/recommendations',
      method: 'POST',
      data: payload,
      auth: true,
    })

    return mapPost(response)
  },

  deletePost(postId) {
    return request({
      url: `/recommendations/${postId}`,
      method: 'DELETE',
      auth: true,
    })
  },

  likePost(postId) {
    return request({
      url: `/recommendations/${postId}/like`,
      method: 'POST',
      auth: true,
    })
  },

  unlikePost(postId) {
    return request({
      url: `/recommendations/${postId}/like`,
      method: 'DELETE',
      auth: true,
    })
  },

  followTeacher(teacherUserId) {
    return request({
      url: `/recommendations/teachers/${teacherUserId}/follow`,
      method: 'POST',
      auth: true,
    })
  },

  unfollowTeacher(teacherUserId) {
    return request({
      url: `/recommendations/teachers/${teacherUserId}/follow`,
      method: 'DELETE',
      auth: true,
    })
  },
}

module.exports = {
  recommendationService,
}
