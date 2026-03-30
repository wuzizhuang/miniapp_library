package com.example.library.dto.recommendation;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RecommendationPostDto {
    private Long postId;
    private Integer authorUserId;
    private String authorUsername;
    private String authorFullName;
    private String authorIdentityType;
    private String authorDepartment;
    private Integer bookId;
    private String bookTitle;
    private String bookIsbn;
    private String bookCoverUrl;
    private String content;
    private LocalDateTime createTime;
    private Long likeCount;
    private Boolean likedByMe;
    private Boolean followingAuthor;
    private Boolean canManage;
}
