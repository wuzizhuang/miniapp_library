package com.example.library.service;

import com.example.library.dto.publicapi.PublicAiChatResponseDto;

/**
 * AI chat proxy for public web experiences.
 */
public interface AiChatService {
    PublicAiChatResponseDto chat(String message, String previousResponseId);
}
