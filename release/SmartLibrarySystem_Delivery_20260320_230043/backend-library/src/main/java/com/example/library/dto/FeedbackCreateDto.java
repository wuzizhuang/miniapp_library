package com.example.library.dto;

import com.example.library.entity.UserFeedback;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Create feedback request DTO.
 */
@Data
public class FeedbackCreateDto {

    @NotNull(message = "Category is required")
    private UserFeedback.FeedbackCategory category;

    @NotBlank(message = "Subject is required")
    @Size(max = 150, message = "Subject must be <= 150 chars")
    private String subject;

    @NotBlank(message = "Content is required")
    @Size(max = 2000, message = "Content must be <= 2000 chars")
    private String content;

    @Size(max = 120, message = "Contact email must be <= 120 chars")
    private String contactEmail;
}
