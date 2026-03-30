package com.example.library.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * User follow-up message request DTO.
 */
@Data
public class FeedbackFollowUpDto {

    @NotBlank(message = "Message content is required")
    @Size(max = 2000, message = "Message content must be <= 2000 chars")
    private String content;
}
