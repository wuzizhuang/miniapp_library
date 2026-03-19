package com.example.library.dto;

import com.example.library.entity.UserFeedback;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Admin reply/update feedback request DTO.
 */
@Data
public class FeedbackReplyDto {

    @NotBlank(message = "Reply content is required")
    @Size(max = 2000, message = "Reply content must be <= 2000 chars")
    private String replyContent;

    @NotNull(message = "Status is required")
    private UserFeedback.FeedbackStatus status;
}
