package com.example.library.service.impl;

import com.example.library.dto.auth.PasswordResetActionResponseDto;
import com.example.library.dto.auth.PasswordResetTokenValidationDto;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.repository.UserRepository;
import com.example.library.service.EmailService;
import com.example.library.service.PasswordResetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

/**
 * 密码找回服务实现。
 * 负责找回申请、令牌校验、重置落库以及邮件/日志投递。
 */
@Slf4j
@Service
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final String GENERIC_REQUEST_MESSAGE =
            "如果该邮箱已绑定账号，系统已受理重置请求。";
    private static final String RESET_SUCCESS_MESSAGE = "密码重置成功，请使用新密码重新登录。";
    private static final String DELIVERY_METHOD_EMAIL = "EMAIL";
    private static final String DELIVERY_METHOD_LOG = "LOG";
    private static final String DELIVERY_METHOD_NONE = "NONE";
    private static final String INVALID_TOKEN_MESSAGE = "重置链接无效，或该链接已被使用。";
    private static final String EXPIRED_TOKEN_MESSAGE = "重置链接已过期，请重新申请。";
    private static final String VALID_TOKEN_MESSAGE = "重置链接有效，可以继续设置新密码。";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<EmailService> emailServiceProvider;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${security.password-reset.expiration-minutes:30}")
    private int expirationMinutes;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public PasswordResetServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ObjectProvider<EmailService> emailServiceProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailServiceProvider = emailServiceProvider;
    }

    @Override
    @Transactional
    public PasswordResetActionResponseDto requestPasswordReset(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);
        // 为防止邮箱枚举攻击，不论邮箱是否存在都返回统一受理提示。
        String deliveryMethod = resolveEmailService() != null
                ? DELIVERY_METHOD_EMAIL
                : DELIVERY_METHOD_LOG;

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String rawToken = generateToken();
            String resetUrl = "%s/auth/reset-password?token=%s".formatted(frontendBaseUrl, rawToken);

            user.setPasswordResetTokenHash(hashToken(rawToken));
            user.setPasswordResetRequestedAt(LocalDateTime.now());
            user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(expirationMinutes));
            user.setPasswordResetUsedAt(null);
            userRepository.save(user);

            EmailService emailService = resolveEmailService();
            if (emailService != null) {
                try {
                    emailService.sendPasswordResetEmail(
                            user.getEmail(),
                            user.getFullName() != null ? user.getFullName() : user.getUsername(),
                            resetUrl,
                            expirationMinutes);
                } catch (Exception ex) {
                    // 邮件发送失败时自动降级为日志投递，保证联调和排障仍可继续。
                    deliveryMethod = DELIVERY_METHOD_LOG;
                    log.warn("Failed to send password reset email to {}: {}", user.getEmail(), ex.getMessage());
                }
            }

            if (DELIVERY_METHOD_LOG.equals(deliveryMethod)) {
                log.info(
                        "Password reset link generated for user {} (email: {}): {}",
                        user.getUsername(),
                        user.getEmail(),
                        resetUrl);
            }
        }

        return new PasswordResetActionResponseDto(GENERIC_REQUEST_MESSAGE, deliveryMethod, expirationMinutes);
    }

    /**
     * 校验重置令牌是否存在、未使用且未过期。
     */
    @Override
    @Transactional(readOnly = true)
    public PasswordResetTokenValidationDto validateResetToken(String token) {
        if (token == null || token.isBlank()) {
            return new PasswordResetTokenValidationDto(false, INVALID_TOKEN_MESSAGE);
        }

        Optional<User> userOpt = userRepository.findByPasswordResetTokenHash(hashToken(token));

        if (userOpt.isEmpty()) {
            return new PasswordResetTokenValidationDto(false, INVALID_TOKEN_MESSAGE);
        }

        User user = userOpt.get();

        if (user.getPasswordResetUsedAt() != null || user.getPasswordResetTokenHash() == null) {
            return new PasswordResetTokenValidationDto(false, INVALID_TOKEN_MESSAGE);
        }

        if (user.getPasswordResetExpiresAt() == null || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            return new PasswordResetTokenValidationDto(false, EXPIRED_TOKEN_MESSAGE);
        }

        return new PasswordResetTokenValidationDto(true, VALID_TOKEN_MESSAGE);
    }

    /**
     * 提交新密码并销毁旧的重置令牌。
     */
    @Override
    @Transactional
    public PasswordResetActionResponseDto resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetTokenHash(hashToken(token))
                .orElseThrow(() -> new BadRequestException(INVALID_TOKEN_MESSAGE));

        if (user.getPasswordResetUsedAt() != null || user.getPasswordResetTokenHash() == null) {
            throw new BadRequestException(INVALID_TOKEN_MESSAGE);
        }

        if (user.getPasswordResetExpiresAt() == null || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException(EXPIRED_TOKEN_MESSAGE);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setTokenValidAfter(LocalDateTime.now());
        user.setPasswordResetUsedAt(LocalDateTime.now());
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
        user.setPasswordResetRequestedAt(null);
        userRepository.save(user);

        return new PasswordResetActionResponseDto(RESET_SUCCESS_MESSAGE, DELIVERY_METHOD_NONE, null);
    }

    /**
     * 统一标准化邮箱。
     */
    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    /**
     * 延迟获取邮件服务。
     * 当前项目允许在未启用 SMTP 时退化为仅写日志。
     */
    private EmailService resolveEmailService() {
        return emailServiceProvider != null ? emailServiceProvider.getIfAvailable() : null;
    }

    /**
     * 生成一次性原始重置令牌。
     */
    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * 对外发放原始令牌，对内仅保存哈希值，降低数据库泄露风险。
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
