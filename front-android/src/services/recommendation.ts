import type {
  ApiRecommendationCreateDto,
  ApiRecommendationPostDto,
  ApiRecommendationScope,
  PageResponse,
} from "../types/api";
import { request } from "./http";

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

export const recommendationService = {
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

  async createPost(payload: ApiRecommendationCreateDto): Promise<RecommendationPost> {
    const response = await request<ApiRecommendationPostDto, ApiRecommendationCreateDto>({
      url: "/recommendations",
      method: "POST",
      data: payload,
      auth: true,
    });

    return mapPost(response);
  },

  async deletePost(postId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/${postId}`,
      method: "DELETE",
      auth: true,
    });
  },

  async likePost(postId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/${postId}/like`,
      method: "POST",
      auth: true,
    });
  },

  async unlikePost(postId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/${postId}/like`,
      method: "DELETE",
      auth: true,
    });
  },

  async followTeacher(teacherUserId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/teachers/${teacherUserId}/follow`,
      method: "POST",
      auth: true,
    });
  },

  async unfollowTeacher(teacherUserId: number): Promise<void> {
    await request<void>({
      url: `/recommendations/teachers/${teacherUserId}/follow`,
      method: "DELETE",
      auth: true,
    });
  },
};
