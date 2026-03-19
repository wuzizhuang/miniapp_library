package com.example.library.dto.publicapi;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Public AI chat request payload.
 */
@Data
public class PublicAiChatRequestDto {
    @NotBlank(message = "Message is required")
    @Size(max = 4000, message = "Message must be less than 4000 characters")
    private String message;

    @Size(max = 200, message = "Previous response id must be less than 200 characters")
    private String previousResponseId;
}
