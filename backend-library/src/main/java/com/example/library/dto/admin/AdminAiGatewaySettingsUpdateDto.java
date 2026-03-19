package com.example.library.dto.admin;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Admin request payload for updating AI gateway settings.
 */
@Data
public class AdminAiGatewaySettingsUpdateDto {
    private Boolean enabled;

    @Size(max = 40, message = "Provider must be less than 40 characters")
    private String provider;

    @Size(max = 255, message = "Gateway URL must be less than 255 characters")
    private String baseUrl;

    @Size(max = 120, message = "Model must be less than 120 characters")
    private String model;

    @Size(max = 1000, message = "API Key must be less than 1000 characters")
    private String apiKey;

    private Boolean clearApiKey;
}
