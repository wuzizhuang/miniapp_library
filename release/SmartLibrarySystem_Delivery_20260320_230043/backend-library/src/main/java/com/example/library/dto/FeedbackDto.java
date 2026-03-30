package com.example.library.dto;

import com.example.library.entity.UserFeedback;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Feedback response DTO.
 */
@Data
public class FeedbackDto {
    private Long feedbackId;
    private Integer userId;
    private String username;
    private UserFeedback.FeedbackCategory category;
    private String subject;
    private String content;
    private String contactEmail;
    private UserFeedback.FeedbackStatus status;
    private String adminReply;
    private String handledBy;
    private LocalDateTime replyTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private List<FeedbackMessageDto> messages;
}
