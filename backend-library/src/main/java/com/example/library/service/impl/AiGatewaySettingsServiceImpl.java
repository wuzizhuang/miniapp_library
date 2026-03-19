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
 * Stores editable AI gateway settings with encrypted API keys.
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

    private AiGatewaySettings createDefaultEntity() {
        AiGatewaySettings settings = new AiGatewaySettings();
        settings.setSettingsId(SINGLETON_ID);
        settings.setEnabled(defaultEnabled);
        settings.setProvider(defaultProvider);
        settings.setBaseUrl(stripTrailingSlash(defaultBaseUrl));
        settings.setModelName(defaultModel);
        return settings;
    }

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

    private SecretKeySpec buildSecretKey() {
        try {
            byte[] secretBytes = Base64.getDecoder().decode(encryptionSecret);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(secretBytes);
            return new SecretKeySpec(digest, "AES");
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Failed to initialize AI gateway encryption key", ex);
        }
    }

    private String normalizeNullable(String value, String fallback) {
        if (value == null) {
            return fallback;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? fallback : normalized;
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

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
