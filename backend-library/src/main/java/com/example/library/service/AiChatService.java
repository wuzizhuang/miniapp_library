package com.example.library.service;

import com.example.library.dto.publicapi.PublicAiChatRequestDto;
import com.example.library.dto.publicapi.PublicAiChatResponseDto;

import java.util.List;

/**
 * AI chat proxy for public web experiences.
 */
public interface AiChatService {
    PublicAiChatResponseDto chat(List<PublicAiChatRequestDto.ChatMessageItem> messages);
}
