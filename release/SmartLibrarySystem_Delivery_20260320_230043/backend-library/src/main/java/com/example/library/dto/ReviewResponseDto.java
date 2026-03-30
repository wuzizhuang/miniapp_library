package com.example.library.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Review response DTO.
 */
@Data
public class ReviewResponseDto {
    private Long reviewId;
    private Integer userId;
    private String username;
    private String userFullName;
    private String userAvatar;
    private Integer bookId;
    private String bookTitle;
    private String bookIsbn;
    private Integer rating;
    private String commentText;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime auditTime;
}
