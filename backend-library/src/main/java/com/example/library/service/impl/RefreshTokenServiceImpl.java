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
 * 刷新令牌服务实现。
 * 采用轮换策略发放和吊销 refresh token，避免长期复用同一个令牌。
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

    /**
     * 刷新会话。
     * 当前令牌验证通过后会立即作废，并签发一组新的 access/refresh token。
     */
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

    /**
     * 吊销单个刷新令牌。
     */
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

    /**
     * 吊销用户当前全部有效刷新令牌。
     */
    @Override
    @Transactional
    public void revokeAllUserTokens(Integer userId) {
        refreshTokenRepository.revokeActiveTokensForUser(userId, LocalDateTime.now());
    }

    /**
     * 加载并校验处于启用状态的用户。
     */
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

    /**
     * 持久化 refresh token，仅保存哈希值。
     */
    private RefreshToken persistRefreshToken(User user, String rawRefreshToken) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashToken(rawRefreshToken));
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(Math.max(refreshTokenExpirationMs / 1000, 1)));
        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * 校验 refresh token 是否被吊销、是否过期，以及是否早于用户令牌失效时间。
     */
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

    /**
     * 生成原始 refresh token 字符串。
     */
    private String generateRawRefreshToken() {
        byte[] bytes = new byte[48];
        new java.security.SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * 对 refresh token 做哈希，数据库中不保存明文。
     */
    private String hashToken(String rawRefreshToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available", ex);
        }
    }

    /**
     * 提取所有角色，统一为大写形式，便于前端权限判断。
     */
    private List<String> extractRoles(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> value.startsWith("ROLE_"))
                .map(value -> value.substring(5).toUpperCase())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new))
                .stream()
                .toList();
    }

    /**
     * 提取非角色型权限字符串。
     */
    private List<String> extractPermissions(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> !value.startsWith("ROLE_"))
                .toList();
    }

    /**
     * 推导主角色。
     * 若同时拥有多个角色，后台默认优先展示 ADMIN。
     */
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
