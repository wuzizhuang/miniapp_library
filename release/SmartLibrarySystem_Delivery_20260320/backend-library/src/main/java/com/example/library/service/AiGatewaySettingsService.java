package com.example.library.service;

import com.example.library.dto.admin.AdminAiGatewaySettingsDto;
import com.example.library.dto.admin.AdminAiGatewaySettingsUpdateDto;

/**
 * Persistent AI gateway settings service.
 */
public interface AiGatewaySettingsService {
    AdminAiGatewaySettingsDto getAdminSettings();

    AdminAiGatewaySettingsDto updateSettings(AdminAiGatewaySettingsUpdateDto dto, String actorUsername);

    EffectiveAiGatewaySettings getEffectiveSettings();

    record EffectiveAiGatewaySettings(
            boolean enabled,
            String provider,
            String baseUrl,
            String apiKey,
            String model) {
    }
}
