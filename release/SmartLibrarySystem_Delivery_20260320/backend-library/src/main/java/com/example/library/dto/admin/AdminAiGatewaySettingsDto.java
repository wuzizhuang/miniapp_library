package com.example.library.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Admin-facing AI gateway settings payload.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiGatewaySettingsDto {
    private boolean enabled;
    private String provider;
    private String baseUrl;
    private String model;
    private boolean hasApiKey;
    private String apiKeyMasked;
    private String updatedBy;
    private LocalDateTime updateTime;
}
