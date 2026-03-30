package com.example.library.service;

import com.example.library.dto.JwtResponseDto;
import com.example.library.entity.RefreshToken;
import com.example.library.entity.User;
import com.example.library.exception.UnauthorizedException;
import com.example.library.repository.RefreshTokenRepository;
import com.example.library.repository.UserRepository;
import com.example.library.security.JwtUtils;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.impl.RefreshTokenServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService 单元测试")
class RefreshTokenServiceImplTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private RefreshTokenServiceImpl refreshTokenService;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenExpirationMs", 86_400_000L);
        user = TestDataFactory.createUser(1, "alice");
        user.setStatus(User.UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("issueSession：成功下发 access token 与 refresh token")
    void issueSession_success() {
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(jwtUtils.generateJwtToken(any(UserDetailsImpl.class))).thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> {
            RefreshToken token = invocation.getArgument(0);
            token.setRefreshTokenId(10L);
            token.setCreateTime(LocalDateTime.now());
            return token;
        });

        JwtResponseDto session = refreshTokenService.issueSession(1, "alice");

        assertThat(session.getToken()).isEqualTo("access-token");
        assertThat(session.getRefreshToken()).isNotBlank();
        assertThat(session.getRefreshTokenExpiresAt()).isNotNull();
    }

    @Test
    @DisplayName("refreshSession：成功轮换 refresh token")
    void refreshSession_success() {
        RefreshToken existing = new RefreshToken();
        existing.setRefreshTokenId(1L);
        existing.setUser(user);
        existing.setTokenHash(hash("raw-refresh-token"));
        existing.setCreateTime(LocalDateTime.now().minusHours(1));
        existing.setExpiresAt(LocalDateTime.now().plusDays(5));

        when(refreshTokenRepository.findByTokenHash(hash("raw-refresh-token"))).thenReturn(Optional.of(existing));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(jwtUtils.generateJwtToken(any(UserDetailsImpl.class))).thenReturn("rotated-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> {
            RefreshToken token = invocation.getArgument(0);
            if (token.getRefreshTokenId() == null) {
                token.setRefreshTokenId(2L);
                token.setCreateTime(LocalDateTime.now());
            }
            return token;
        });

        JwtResponseDto session = refreshTokenService.refreshSession("raw-refresh-token");

        assertThat(existing.getRevokedAt()).isNotNull();
        assertThat(session.getToken()).isEqualTo("rotated-access-token");
        assertThat(session.getRefreshToken()).isNotBlank().isNotEqualTo("raw-refresh-token");
    }

    @Test
    @DisplayName("refreshSession：过期 token 被拒绝")
    void refreshSession_expiredTokenRejected() {
        RefreshToken existing = new RefreshToken();
        existing.setUser(user);
        existing.setTokenHash(hash("expired-token"));
        existing.setCreateTime(LocalDateTime.now().minusDays(10));
        existing.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(refreshTokenRepository.findByTokenHash(hash("expired-token"))).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> refreshTokenService.refreshSession("expired-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("过期");
    }

    @Test
    @DisplayName("revokeAllUserTokens：按用户批量吊销活动 refresh token")
    void revokeAllUserTokens_success() {
        refreshTokenService.revokeAllUserTokens(1);

        verify(refreshTokenRepository).revokeActiveTokensForUser(eq(1), any(LocalDateTime.class));
    }

    private String hash(String rawToken) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
