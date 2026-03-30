/**
 * @file 推荐动态服务模块
 * @description 处理图书推荐动态（类似社交分享）的 API 调用：
 *   - 获取推荐动态信息流
 *   - 发布/删除推荐动态
 *   - 点赞/取消点赞
 *   - 关注/取消关注推荐者
 */

const { request } = require('../utils/request')

/**
 * 将后端推荐动态 DTO 映射为前端统一的动态对象
 * @param {Object} dto - 后端动态数据
 * @returns {Object} 前端动态对象
 */
function mapPost(dto) {
  return {
    postId: dto.postId,                            // 动态 ID
    authorUserId: dto.authorUserId,                // 作者用户 ID
    authorUsername: dto.authorUsername,             // 作者用户名
    authorFullName: dto.authorFullName,             // 作者姓名
    authorIdentityType: dto.authorIdentityType,    // 作者身份类型
    authorDepartment: dto.authorDepartment,        // 作者院系
    bookId: dto.bookId,                            // 推荐图书 ID
    bookTitle: dto.bookTitle,                      // 推荐图书书名
    bookIsbn: dto.bookIsbn,                        // ISBN
    bookCoverUrl: dto.bookCoverUrl,                // 封面 URL
    content: dto.content,                          // 推荐理由
    createTime: dto.createTime,                    // 发布时间
    likeCount: dto.likeCount || 0,                 // 点赞数
    likedByMe: Boolean(dto.likedByMe),             // 是否已点赞
    followingAuthor: Boolean(dto.followingAuthor),  // 是否已关注
    canManage: Boolean(dto.canManage),             // 是否可管理
  }
}

const recommendationService = {
  /** 获取推荐信息流 */
  async getFeed(scope, page, size) {
    const response = await request({
      url: '/recommendations',
      query: { scope: scope || 'all', page: page || 0, size: size || 20 },
      auth: true,
    })
    return { ...response, content: (response.content || []).map(mapPost) }
  },

  /** 发布推荐动态 */
  async createPost(payload) {
    const response = await request({ url: '/recommendations', method: 'POST', data: payload, auth: true })
    return mapPost(response)
  },

  /** 删除推荐动态 */
  deletePost(postId) {
    return request({ url: `/recommendations/${postId}`, method: 'DELETE', auth: true })
  },

  /** 点赞 */
  likePost(postId) {
    return request({ url: `/recommendations/${postId}/like`, method: 'POST', auth: true })
  },

  /** 取消点赞 */
  unlikePost(postId) {
    return request({ url: `/recommendations/${postId}/like`, method: 'DELETE', auth: true })
  },

  /** 关注教师 */
  followTeacher(teacherUserId) {
    return request({ url: `/recommendations/teachers/${teacherUserId}/follow`, method: 'POST', auth: true })
  },

  /** 取消关注 */
  unfollowTeacher(teacherUserId) {
    return request({ url: `/recommendations/teachers/${teacherUserId}/follow`, method: 'DELETE', auth: true })
  },
}

module.exports = { recommendationService }
