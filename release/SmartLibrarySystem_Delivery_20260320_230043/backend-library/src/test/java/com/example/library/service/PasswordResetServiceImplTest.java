package com.example.library.service;

import com.example.library.dto.auth.PasswordResetActionResponseDto;
import com.example.library.dto.auth.PasswordResetTokenValidationDto;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.PasswordResetServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * PasswordResetService 单元测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PasswordResetService 单元测试")
class PasswordResetServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetServiceImpl passwordResetService;

    private User user;

    @BeforeEach
    void setUp() {
        user = TestDataFactory.createUser(1, "alice");
        user.setEmail("alice@example.com");
        user.setPasswordHash("encoded-old");

        ReflectionTestUtils.setField(passwordResetService, "expirationMinutes", 30);
        ReflectionTestUtils.setField(passwordResetService, "frontendBaseUrl", "http://localhost:3000");
    }

    @Nested
    @DisplayName("requestPasswordReset")
    class RequestPasswordReset {

        @Test
        @DisplayName("存在邮箱时生成 token 并返回通用响应")
        void requestForExistingEmail_generatesToken() {
            when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PasswordResetActionResponseDto result = passwordResetService.requestPasswordReset("alice@example.com");

            assertThat(result.getDeliveryMethod()).isEqualTo("LOG");
            assertThat(result.getExpiresInMinutes()).isEqualTo(30);
            assertThat(user.getPasswordResetTokenHash()).isNotBlank();
            assertThat(user.getPasswordResetExpiresAt()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("不存在邮箱时返回相同通用响应，不写库")
        void requestForMissingEmail_returnsSameResponse() {
            when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

            PasswordResetActionResponseDto result = passwordResetService.requestPasswordReset("missing@example.com");

            assertThat(result.getMessage()).contains("If the email exists");
            verify(userRepository, never()).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("validateResetToken")
    class ValidateResetToken {

        @Test
        @DisplayName("合法 token 返回 valid=true")
        void validToken_returnsTrue() {
            user.setPasswordResetTokenHash(hash("token-123"));
            user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(10));
            when(userRepository.findByPasswordResetTokenHash(hash("token-123"))).thenReturn(Optional.of(user));

            PasswordResetTokenValidationDto result = passwordResetService.validateResetToken("token-123");

            assertThat(result.isValid()).isTrue();
        }

        @Test
        @DisplayName("过期 token 返回 valid=false")
        void expiredToken_returnsFalse() {
            user.setPasswordResetTokenHash(hash("expired-token"));
            user.setPasswordResetExpiresAt(LocalDateTime.now().minusMinutes(1));
            when(userRepository.findByPasswordResetTokenHash(hash("expired-token"))).thenReturn(Optional.of(user));

            PasswordResetTokenValidationDto result = passwordResetService.validateResetToken("expired-token");

            assertThat(result.isValid()).isFalse();
            assertThat(result.getMessage()).contains("expired");
        }

        @Test
        @DisplayName("错误 token 返回 valid=false")
        void wrongToken_returnsFalse() {
            when(userRepository.findByPasswordResetTokenHash(hash("wrong-token"))).thenReturn(Optional.empty());

            PasswordResetTokenValidationDto result = passwordResetService.validateResetToken("wrong-token");

            assertThat(result.isValid()).isFalse();
            assertThat(result.getMessage()).contains("invalid");
        }
    }

    @Nested
    @DisplayName("resetPassword")
    class ResetPassword {

        @Test
        @DisplayName("合法 token 成功重置，旧密码失效，新密码生效")
        void validToken_resetsPassword() {
            user.setPasswordResetTokenHash(hash("token-123"));
            user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(10));
            when(userRepository.findByPasswordResetTokenHash(hash("token-123"))).thenReturn(Optional.of(user));
            when(passwordEncoder.encode("NewPassword123!")).thenReturn("encoded-new");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PasswordResetActionResponseDto result = passwordResetService.resetPassword("token-123", "NewPassword123!");

            assertThat(result.getMessage()).contains("Password reset successful");
            assertThat(user.getPasswordHash()).isEqualTo("encoded-new");
            assertThat(user.getPasswordResetTokenHash()).isNull();
            assertThat(user.getPasswordResetUsedAt()).isNotNull();
            assertThat("encoded-old").isNotEqualTo(user.getPasswordHash());
        }

        @Test
        @DisplayName("过期 token 重置失败")
        void expiredToken_resetFails() {
            user.setPasswordResetTokenHash(hash("expired-token"));
            user.setPasswordResetExpiresAt(LocalDateTime.now().minusMinutes(1));
            when(userRepository.findByPasswordResetTokenHash(hash("expired-token"))).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> passwordResetService.resetPassword("expired-token", "NewPassword123!"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("expired");
        }

        @Test
        @DisplayName("重复使用 token 重置失败")
        void usedToken_resetFails() {
            user.setPasswordResetTokenHash(hash("used-token"));
            user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(10));
            user.setPasswordResetUsedAt(LocalDateTime.now().minusMinutes(1));
            when(userRepository.findByPasswordResetTokenHash(hash("used-token"))).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> passwordResetService.resetPassword("used-token", "NewPassword123!"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("invalid");
        }
    }

    private String hash(String token) {
        return (String) ReflectionTestUtils.invokeMethod(passwordResetService, "hashToken", token);
    }
}
