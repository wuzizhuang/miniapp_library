import apiClient from "@/lib/axios";

/**
 * 单本推荐图书的前端视图结构。
 */
export interface RecommendedBook {
  bookId: number;
  isbn: string;
  title: string;
  coverUrl?: string;
  description?: string;
  publishedYear?: number;
  language?: string;
  publisherName?: string;
  categoryName?: string;
  authorNames?: string[];
  availableCopies?: number;
  totalCopies?: number;
  avgRating?: number;
  reviewCount?: number;
  /** 推荐来源说明 */
  reason: string;
}

/**
 * 个人推荐多策略响应结构。
 */
export interface PersonalRecommendationResponse {
  /** 基于分类偏好 */
  byCategory: RecommendedBook[];
  /** 基于作者偏好 */
  byAuthor: RecommendedBook[];
  /** 基于协同过滤 */
  byCollaborative: RecommendedBook[];
  /** 基于兴趣标签 */
  byInterestTags: RecommendedBook[];
  /** 热门兜底 */
  trending: RecommendedBook[];
}

/**
 * 个人推荐接口服务。
 */
export const personalRecommendationService = {
  /**
   * 获取当前登录用户的个人推荐。
   * @param limit 每个维度最多返回多少本书
   */
  getRecommendations: async (
    limit = 6,
  ): Promise<PersonalRecommendationResponse> => {
    const { data } = await apiClient.get<PersonalRecommendationResponse>(
      "/personal-recommendations",
      { params: { limit } },
    );

    return {
      byCategory: data.byCategory ?? [],
      byAuthor: data.byAuthor ?? [],
      byCollaborative: data.byCollaborative ?? [],
      byInterestTags: data.byInterestTags ?? [],
      trending: data.trending ?? [],
    };
  },
};
