package com.example.library.service.impl;

import com.example.library.dto.JwtResponseDto;
import com.example.library.entity.RefreshToken;
import com.example.library.entity.User;
import com.example.library.exception.UnauthorizedException;
import com.example.library.repository.RefreshTokenRepository;
import com.example.library.repository.UserRepository;
import com.example.library.security.JwtUtils;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Default refresh token service with rotation.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    @Value("${security.refresh-token.expiration:2592000000}")
    private long refreshTokenExpirationMs;

    @Override
    @Transactional
    public JwtResponseDto issueSession(Integer userId, String username) {
        User user = resolveActiveUser(userId, username);
        String rawRefreshToken = generateRawRefreshToken();
        RefreshToken persisted = persistRefreshToken(user, rawRefreshToken);
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);

        return new JwtResponseDto(
                jwtUtils.generateJwtToken(userDetails),
                user.getUserId(),
                user.getUsername(),
                resolvePrimaryRole(userDetails),
                extractRoles(userDetails),
                extractPermissions(userDetails),
                rawRefreshToken,
                persisted.getExpiresAt());
    }

    @Override
    @Transactional
    public JwtResponseDto refreshSession(String rawRefreshToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("刷新令牌无效或已失效"));
        validateRefreshToken(refreshToken);

        refreshToken.setRevokedAt(LocalDateTime.now());
        refreshToken.setLastUsedAt(LocalDateTime.now());
        refreshTokenRepository.save(refreshToken);

        return issueSession(refreshToken.getUser().getUserId(), refreshToken.getUser().getUsername());
    }

    @Override
    @Transactional
    public void revokeRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }

        refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    @Override
    @Transactional
    public void revokeAllUserTokens(Integer userId) {
        refreshTokenRepository.revokeActiveTokensForUser(userId, LocalDateTime.now());
    }

    private User resolveActiveUser(Integer userId, String username) {
        User user;
        if (userId != null) {
            user = userRepository.findById(userId)
                    .orElseThrow(() -> new UnauthorizedException("用户不存在或已失效"));
        } else if (username != null && !username.isBlank()) {
            user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UnauthorizedException("用户不存在或已失效"));
        } else {
            throw new UnauthorizedException("用户不存在或已失效");
        }

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new UnauthorizedException("当前账号不可用，请重新登录");
        }
        return user;
    }

    private RefreshToken persistRefreshToken(User user, String rawRefreshToken) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashToken(rawRefreshToken));
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(Math.max(refreshTokenExpirationMs / 1000, 1)));
        return refreshTokenRepository.save(refreshToken);
    }

    private void validateRefreshToken(RefreshToken refreshToken) {
        if (refreshToken.getRevokedAt() != null) {
            throw new UnauthorizedException("刷新令牌已被吊销，请重新登录");
        }
        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("刷新令牌已过期，请重新登录");
        }

        User user = refreshToken.getUser();
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new UnauthorizedException("当前账号不可用，请重新登录");
        }
        if (user.getTokenValidAfter() != null && refreshToken.getCreateTime() != null
                && !refreshToken.getCreateTime().isAfter(user.getTokenValidAfter())) {
            throw new UnauthorizedException("会话已失效，请重新登录");
        }
    }

    private String generateRawRefreshToken() {
        byte[] bytes = new byte[48];
        new java.security.SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawRefreshToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available", ex);
        }
    }

    private List<String> extractRoles(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> value.startsWith("ROLE_"))
                .map(value -> value.substring(5).toUpperCase())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new))
                .stream()
                .toList();
    }

    private List<String> extractPermissions(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> !value.startsWith("ROLE_"))
                .toList();
    }

    private String resolvePrimaryRole(UserDetailsImpl userDetails) {
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(value -> value.startsWith("ROLE_"))
                .map(value -> value.substring(5).toUpperCase())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        if (roles.contains(User.UserRole.ADMIN.name())) {
            return User.UserRole.ADMIN.name();
        }
        return roles.stream().findFirst().orElse(User.UserRole.USER.name());
    }
}
