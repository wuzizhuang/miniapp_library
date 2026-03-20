package com.example.library.dto.publicapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Public AI chat request payload — standard Chat Completions format.
 */
@Data
public class PublicAiChatRequestDto {

    @NotEmpty(message = "Messages list must not be empty")
    @Size(max = 50, message = "Conversation must not exceed 50 messages")
    @Valid
    private List<ChatMessageItem> messages;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessageItem {
        @NotBlank(message = "Role is required")
        @Size(max = 20)
        private String role;

        @NotBlank(message = "Content is required")
        @Size(max = 4000, message = "Message content must be less than 4000 characters")
        private String content;
    }
}
