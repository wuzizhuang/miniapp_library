package com.example.library.controller;

import com.example.library.dto.admin.AdminAiGatewaySettingsDto;
import com.example.library.dto.admin.AdminAiGatewaySettingsUpdateDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.AiGatewaySettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin endpoints for configuring the backend AI gateway.
 */
@RestController
@RequestMapping("/api/admin/ai-gateway")
@RequiredArgsConstructor
public class AdminAiGatewayController {

    private final AiGatewaySettingsService aiGatewaySettingsService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAiGatewaySettingsDto> getSettings() {
        return ResponseEntity.ok(aiGatewaySettingsService.getAdminSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAiGatewaySettingsDto> updateSettings(
            @Valid @RequestBody AdminAiGatewaySettingsUpdateDto dto,
            Authentication authentication) {
        String actorUsername = authentication == null ? "system" : authentication.getName();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            actorUsername = userDetails.getUsername();
        }
        return ResponseEntity.ok(aiGatewaySettingsService.updateSettings(dto, actorUsername));
    }
}
