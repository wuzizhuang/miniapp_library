/**
 * @file 推荐动态服务
 * @description 封装荐书推荐（社交化阅读）相关的 API 调用：
 *   - getFeed：获取推荐动态流（支持全部 / 关注 / 我的 三种范围）
 *   - createPost：发布新推荐
 *   - deletePost：删除推荐
 *   - likePost：点赞
 *   - unlikePost：取消点赞
 *   - followTeacher：关注教师
 *   - unfollowTeacher：取消关注教师
 */

import type {
  ApiRecommendationCreateDto,
  ApiRecommendationPostDto,
  ApiRecommendationScope,
  PageResponse,
} from "../types/api";
import { request } from "./http";

/** 前端推荐动态视图模型 */
export interface RecommendationPost {
  postId: number;                  // 推荐 ID
  authorUserId: number;            // 作者用户 ID
  authorUsername: string;           // 作者用户名
  authorFullName: string;           // 作者全名
  authorIdentityType?: string;      // 作者身份类型（教师/学生等）
  authorDepartment?: string;        // 作者院系
  bookId: number;                  // 推荐图书 ID
  bookTitle: string;               // 图书标题
  bookIsbn: string;                // ISBN
  bookCoverUrl?: string;           // 封面 URL
  content: string;                 // 推荐内容
  createTime: string;              // 创建时间
  likeCount: number;               // 点赞数
  likedByMe: boolean;              // 当前用户是否已点赞
  followingAuthor: boolean;        // 当前用户是否已关注作者
  canManage: boolean;              // 当前用户是否可管理（删除）
}

/** 将后端推荐 DTO 映射为前端视图模型 */
function mapPost(dto: ApiRecommendationPostDto): RecommendationPost {
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
    likeCount: dto.likeCount ?? 0,
    likedByMe: Boolean(dto.likedByMe),
    followingAuthor: Boolean(dto.followingAuthor),
    canManage: Boolean(dto.canManage),
  };
}

/** 推荐动态服务对象 */
export const recommendationService = {
  /**
   * 获取推荐动态流
   * @param scope - 范围：ALL（全部）/ FOLLOWING（关注）/ MINE（我的）
   * @param page - 页码
   * @param size - 每页数量
   */
  async getFeed(
    scope: ApiRecommendationScope,
    page = 0,
    size = 10,
  ): Promise<PageResponse<RecommendationPost>> {
    const response = await request<PageResponse<ApiRecommendationPostDto>>({
      url: "/recommendations",
      query: { scope, page, size },
      auth: true,
    });

    return {
      ...response,
      content: (response.content ?? []).map(mapPost),
    };
  },

  /** 发布新推荐 */
  async createPost(payload: ApiRecommendationCreateDto): Promise<RecommendationPost> {
    const response = await request<ApiRecommendationPostDto, ApiRecommendationCreateDto>({
      url: "/recommendations",
      method: "POST",
      data: payload,
      auth: true,
    });

    return mapPost(response);
  },

  /** 删除推荐 */
  async deletePost(postId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/${postId}`,
      method: "DELETE",
      auth: true,
    });
  },

  /** 点赞 */
  async likePost(postId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/${postId}/like`,
      method: "POST",
      auth: true,
    });
  },

  /** 取消点赞 */
  async unlikePost(postId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/${postId}/like`,
      method: "DELETE",
      auth: true,
    });
  },

  /** 关注教师 */
  async followTeacher(teacherUserId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/teachers/${teacherUserId}/follow`,
      method: "POST",
      auth: true,
    });
  },

  /** 取消关注教师 */
  async unfollowTeacher(teacherUserId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/teachers/${teacherUserId}/follow`,
      method: "DELETE",
      auth: true,
    });
  },
};
