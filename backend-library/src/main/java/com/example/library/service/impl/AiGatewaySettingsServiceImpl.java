package com.example.library.service.impl;

import com.example.library.dto.admin.AdminAiGatewaySettingsDto;
import com.example.library.dto.admin.AdminAiGatewaySettingsUpdateDto;
import com.example.library.entity.AiGatewaySettings;
import com.example.library.repository.AiGatewaySettingsRepository;
import com.example.library.service.AiGatewaySettingsService;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * AI 网关配置服务实现。
 * 负责维护后台可编辑的网关配置，并对 API Key 做加密落库。
 */
@Service
@RequiredArgsConstructor
public class AiGatewaySettingsServiceImpl implements AiGatewaySettingsService {

    private static final int SINGLETON_ID = 1;
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_LENGTH = 12;

    private final AiGatewaySettingsRepository repository;

    @Value("${app.ai.enabled:false}")
    private boolean defaultEnabled;

    @Value("${app.ai.provider:openai}")
    private String defaultProvider;

    @Value("${app.ai.openai.base-url:https://api.openai.com/v1}")
    private String defaultBaseUrl;

    @Value("${app.ai.openai.api-key:}")
    private String defaultApiKey;

    @Value("${app.ai.openai.model:gpt-4.1-mini}")
    private String defaultModel;

    @Value("${security.jwt.secret}")
    private String encryptionSecret;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    @Transactional(readOnly = true)
    public AdminAiGatewaySettingsDto getAdminSettings() {
        return toAdminDto(repository.findById(SINGLETON_ID).orElse(null));
    }

    /**
     * 更新后台配置。
     * 仅写入前端显式提交的字段，避免把未修改项误覆盖成空值。
     */
    @Override
    @Transactional
    public AdminAiGatewaySettingsDto updateSettings(AdminAiGatewaySettingsUpdateDto dto, String actorUsername) {
        AiGatewaySettings settings = repository.findById(SINGLETON_ID).orElseGet(this::createDefaultEntity);

        if (dto.getEnabled() != null) {
            settings.setEnabled(dto.getEnabled());
        }
        if (dto.getProvider() != null) {
            settings.setProvider(normalizeNullable(dto.getProvider(), defaultProvider));
        }
        if (dto.getBaseUrl() != null) {
            settings.setBaseUrl(normalizeNullable(dto.getBaseUrl(), null));
        }
        if (dto.getModel() != null) {
            settings.setModelName(normalizeNullable(dto.getModel(), null));
        }

        if (Boolean.TRUE.equals(dto.getClearApiKey())) {
            settings.setEncryptedApiKey(null);
        } else if (dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
            settings.setEncryptedApiKey(encrypt(dto.getApiKey().trim()));
        }

        settings.setUpdatedBy(normalizeNullable(actorUsername, "system"));

        return toAdminDto(repository.save(settings));
    }

    /**
     * 计算运行时真正生效的配置。
     * 当数据库中没有配置时，回退到环境变量；即使后台勾选启用，没有可用 API Key 也不会真正放开 AI 能力。
     */
    @Override
    @Transactional(readOnly = true)
    public EffectiveAiGatewaySettings getEffectiveSettings() {
        Optional<AiGatewaySettings> settingsOpt = repository.findById(SINGLETON_ID);
        if (settingsOpt.isEmpty()) {
            return new EffectiveAiGatewaySettings(
                    defaultEnabled && !defaultApiKey.isBlank(),
                    defaultProvider,
                    stripTrailingSlash(defaultBaseUrl),
                    defaultApiKey.trim(),
                    defaultModel);
        }

        AiGatewaySettings settings = settingsOpt.get();
        String apiKey = decryptNullable(settings.getEncryptedApiKey());
        boolean enabled = Boolean.TRUE.equals(settings.getEnabled()) && apiKey != null && !apiKey.isBlank();

        return new EffectiveAiGatewaySettings(
                enabled,
                fallback(settings.getProvider(), defaultProvider),
                stripTrailingSlash(fallback(settings.getBaseUrl(), defaultBaseUrl)),
                apiKey == null ? "" : apiKey,
                fallback(settings.getModelName(), defaultModel));
    }

    /**
     * 构造后台管理页展示用 DTO。
     * 掩码字段只用于展示，避免把完整密钥回传到前端。
     */
    private AdminAiGatewaySettingsDto toAdminDto(@Nullable AiGatewaySettings settings) {
        String effectiveProvider = settings == null ? defaultProvider : fallback(settings.getProvider(), defaultProvider);
        String effectiveBaseUrl = settings == null ? defaultBaseUrl : fallback(settings.getBaseUrl(), defaultBaseUrl);
        String effectiveModel = settings == null ? defaultModel : fallback(settings.getModelName(), defaultModel);
        String encrypted = settings == null ? null : settings.getEncryptedApiKey();
        boolean hasStoredApiKey = encrypted != null && !encrypted.isBlank();
        boolean hasDefaultApiKey = defaultApiKey != null && !defaultApiKey.isBlank();
        boolean hasApiKey = hasStoredApiKey || (!hasStoredApiKey && hasDefaultApiKey);

        return AdminAiGatewaySettingsDto.builder()
                .enabled(settings == null ? defaultEnabled && hasApiKey : Boolean.TRUE.equals(settings.getEnabled()) && hasApiKey)
                .provider(effectiveProvider)
                .baseUrl(stripTrailingSlash(effectiveBaseUrl))
                .model(effectiveModel)
                .hasApiKey(hasApiKey)
                .apiKeyMasked(hasApiKey ? maskApiKey(hasStoredApiKey ? decryptNullable(encrypted) : defaultApiKey) : null)
                .updatedBy(settings == null ? "environment" : settings.getUpdatedBy())
                .updateTime(settings == null ? null : settings.getUpdateTime())
                .build();
    }

    /**
     * 初始化单例配置实体，供首次保存后台配置时使用。
     */
    private AiGatewaySettings createDefaultEntity() {
        AiGatewaySettings settings = new AiGatewaySettings();
        settings.setSettingsId(SINGLETON_ID);
        settings.setEnabled(defaultEnabled);
        settings.setProvider(defaultProvider);
        settings.setBaseUrl(stripTrailingSlash(defaultBaseUrl));
        settings.setModelName(defaultModel);
        return settings;
    }

    /**
     * 使用 JWT 密钥派生出的 AES 密钥加密 API Key。
     */
    private String encrypt(String rawValue) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, buildSecretKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(rawValue.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to encrypt AI gateway API key", ex);
        }
    }

    /**
     * 尝试解密已持久化的 API Key。
     */
    private String decryptNullable(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            return null;
        }

        try {
            byte[] payload = Base64.getDecoder().decode(encryptedValue);
            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[payload.length - IV_LENGTH];
            System.arraycopy(payload, 0, iv, 0, IV_LENGTH);
            System.arraycopy(payload, IV_LENGTH, encrypted, 0, encrypted.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, buildSecretKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Failed to decrypt AI gateway API key", ex);
        }
    }

    /**
     * 从现有安全配置派生固定长度的 AES 密钥，避免再维护额外密钥源。
     */
    private SecretKeySpec buildSecretKey() {
        try {
            byte[] secretBytes = Base64.getDecoder().decode(encryptionSecret);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(secretBytes);
            return new SecretKeySpec(digest, "AES");
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Failed to initialize AI gateway encryption key", ex);
        }
    }

    /**
     * 统一裁剪并处理空白字符串。
     */
    private String normalizeNullable(String value, String fallback) {
        if (value == null) {
            return fallback;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? fallback : normalized;
    }

    /**
     * 空值回退工具。
     */
    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    /**
     * 统一移除末尾斜杠，避免调用接口时出现双斜杠路径。
     */
    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    /**
     * 生成供后台页面展示的密钥掩码。
     */
    private String maskApiKey(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.length() <= 10) {
            return "********";
        }
        return value.substring(0, 4) + "..." + value.substring(value.length() - 4);
    }
}
