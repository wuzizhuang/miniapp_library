package com.example.library.dto.recommendation;

import com.example.library.dto.book.BookDetailDto;
import lombok.Data;

import java.util.List;

/**
 * 个人推荐响应 DTO。
 * 将不同推荐策略的结果汇总为一个综合响应，便于前端分区展示。
 */
@Data
public class PersonalRecommendationDto {

    /** 基于用户偏好分类推荐的图书列表。 */
    private List<RecommendedBookDto> byCategory;

    /** 基于用户偏好作者推荐的图书列表。 */
    private List<RecommendedBookDto> byAuthor;

    /** 基于协同过滤（相似用户）推荐的图书列表。 */
    private List<RecommendedBookDto> byCollaborative;

    /** 基于兴趣标签推荐的图书列表。 */
    private List<RecommendedBookDto> byInterestTags;

    /** 热门图书兜底推荐列表。 */
    private List<RecommendedBookDto> trending;

    /**
     * 单本推荐图书的展示结构。
     * 在 BookDetailDto 基础上追加推荐来源说明。
     */
    @Data
    public static class RecommendedBookDto {
        private Integer bookId;
        private String isbn;
        private String title;
        private String coverUrl;
        private String description;
        private Integer publishedYear;
        private String language;
        private String publisherName;
        private String categoryName;
        private List<String> authorNames;
        private Integer availableCopies;
        private Integer totalCopies;
        private Double avgRating;
        private Integer reviewCount;

        /** 推荐来源说明，例如"因为你借阅过《XXX》"。 */
        private String reason;
    }
}
