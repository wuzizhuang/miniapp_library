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
 * 后台 AI 网关配置控制器。
 * 提供管理员查看和更新大模型接入配置的接口。
 */
@RestController
@RequestMapping("/api/admin/ai-gateway")
@RequiredArgsConstructor
public class AdminAiGatewayController {

    private final AiGatewaySettingsService aiGatewaySettingsService;

    /**
     * 查询当前后台可见的 AI 网关配置快照。
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAiGatewaySettingsDto> getSettings() {
        return ResponseEntity.ok(aiGatewaySettingsService.getAdminSettings());
    }

    /**
     * 更新 AI 网关配置，并记录本次操作人。
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAiGatewaySettingsDto> updateSettings(
            @Valid @RequestBody AdminAiGatewaySettingsUpdateDto dto,
            Authentication authentication) {
        // 后台审计更关注真实操作者，因此优先从已认证主体中解析用户名。
        String actorUsername = authentication == null ? "system" : authentication.getName();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            actorUsername = userDetails.getUsername();
        }
        return ResponseEntity.ok(aiGatewaySettingsService.updateSettings(dto, actorUsername));
    }
}
