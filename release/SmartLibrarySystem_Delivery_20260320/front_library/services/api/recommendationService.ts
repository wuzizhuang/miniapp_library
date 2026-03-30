import apiClient from "@/lib/axios";
import {
  ApiRecommendationCreateDto,
  ApiRecommendationPostDto,
  ApiRecommendationScope,
  PageResponse,
} from "@/types/api";

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

export const recommendationService = {
  getFeed: async (
    scope: ApiRecommendationScope,
    page = 0,
    size = 20,
  ): Promise<PageResponse<RecommendationPost>> => {
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
