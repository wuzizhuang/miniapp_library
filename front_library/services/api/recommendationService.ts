import apiClient from "@/lib/axios";
import {
  ApiRecommendationCreateDto,
  ApiRecommendationPostDto,
  ApiRecommendationScope,
  PageResponse,
} from "@/types/api";

/**
 * 推荐帖子前端视图结构。
 * 兼顾帖子内容、作者关系状态和当前用户是否可管理等 UI 所需字段。
 */
export interface RecommendationPost {
  postId: number;
  authorUserId: number;
  authorUsername: string;
  authorFullName: string;
  authorIdentityType?: string;
  authorDepartment?: string;
  bookId: number;
  bookTitle: string;
  bookIsbn: string;
  bookCoverUrl?: string;
  content: string;
  createTime: string;
  likeCount: number;
  likedByMe: boolean;
  followingAuthor: boolean;
  canManage: boolean;
}

/**
 * 统一整理后端推荐帖子 DTO。
 */
function mapDto(dto: ApiRecommendationPostDto): RecommendationPost {
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

/**
 * 书单推荐社区接口服务。
 */
export const recommendationService = {
  getFeed: async (
    scope: ApiRecommendationScope,
    page = 0,
    size = 20,
  ): Promise<PageResponse<RecommendationPost>> => {
    // feed 范围由后端决定具体查询逻辑，前端只负责把 DTO 变成稳定列表结构。
    const { data } = await apiClient.get<PageResponse<ApiRecommendationPostDto>>(
      "/recommendations",
      { params: { scope, page, size } },
    );

    return {
      ...data,
      content: (data.content ?? []).map(mapDto),
    };
  },

  createPost: async (payload: ApiRecommendationCreateDto): Promise<RecommendationPost> => {
    const { data } = await apiClient.post<ApiRecommendationPostDto>("/recommendations", payload);

    return mapDto(data);
  },

  deletePost: async (postId: number): Promise<void> => {
    await apiClient.delete(`/recommendations/${postId}`);
  },

  likePost: async (postId: number): Promise<void> => {
    await apiClient.post(`/recommendations/${postId}/like`);
  },

  unlikePost: async (postId: number): Promise<void> => {
    await apiClient.delete(`/recommendations/${postId}/like`);
  },

  followTeacher: async (teacherUserId: number): Promise<void> => {
    await apiClient.post(`/recommendations/teachers/${teacherUserId}/follow`);
  },

  unfollowTeacher: async (teacherUserId: number): Promise<void> => {
    await apiClient.delete(`/recommendations/teachers/${teacherUserId}/follow`);
  },
};
