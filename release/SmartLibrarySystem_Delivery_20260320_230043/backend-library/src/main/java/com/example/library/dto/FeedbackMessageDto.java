package com.example.library.dto;

import com.example.library.entity.UserFeedbackMessage;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Feedback conversation message DTO.
 */
@Data
public class FeedbackMessageDto {
    private Long messageId;
    private UserFeedbackMessage.SenderType senderType;
    private Integer senderUserId;
    private String senderUsername;
    private String senderName;
    private String content;
    private LocalDateTime createTime;
}
