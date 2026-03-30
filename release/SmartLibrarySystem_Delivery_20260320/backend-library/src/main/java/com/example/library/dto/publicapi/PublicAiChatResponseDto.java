package com.example.library.dto.publicapi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Public AI chat response payload.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicAiChatResponseDto {
    private String reply;
    private String provider;
    private String model;
}
