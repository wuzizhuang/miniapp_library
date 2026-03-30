package com.example.library.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Redis-backed JWT blacklist with in-memory fallback.
 */
@Service
@Slf4j
public class TokenBlacklistService {
    private static final String REDIS_KEY_PREFIX = "security:jwt:blacklist:";

    private final ConcurrentHashMap<String, Instant> blacklistedTokens = new ConcurrentHashMap<>();
    private final StringRedisTemplate redisTemplate;
    private final boolean redisEnabled;
    private final Clock clock;

    @Autowired
    public TokenBlacklistService(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider,
            @Value("${app.security.redis-enabled:false}") boolean redisEnabled) {
        this(redisTemplateProvider.getIfAvailable(), redisEnabled, Clock.systemUTC());
    }

    TokenBlacklistService(Clock clock) {
        this(null, false, clock);
    }

    TokenBlacklistService(StringRedisTemplate redisTemplate, boolean redisEnabled, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.redisEnabled = redisEnabled;
        this.clock = clock;
    }

    /**
     * Adds a token to the blacklist until its natural expiry time.
     */
    public void blacklistToken(String token, Instant expiresAt) {
        if (token == null || token.isBlank() || expiresAt == null) {
            return;
        }

        Instant now = Instant.now(clock);
        if (!expiresAt.isAfter(now)) {
            return;
        }

        blacklistedTokens.put(token, expiresAt);

        if (!shouldUseRedis()) {
            return;
        }

        Duration ttl = Duration.between(now, expiresAt);

        try {
            redisTemplate.opsForValue().set(buildRedisKey(token), expiresAt.toString(), ttl);
        } catch (RuntimeException ex) {
            log.warn("Failed to persist JWT blacklist entry to Redis, keeping local fallback only: {}", ex.getMessage());
        }
    }

    /**
     * Returns whether the token is currently blacklisted.
     */
    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        Instant now = Instant.now(clock);
        Instant expiresAt = blacklistedTokens.get(token);
        if (expiresAt != null) {
            if (expiresAt.isAfter(now)) {
                return true;
            }

            blacklistedTokens.remove(token, expiresAt);
        }

        if (!shouldUseRedis()) {
            return false;
        }

        try {
            Boolean exists = redisTemplate.hasKey(buildRedisKey(token));
            return Boolean.TRUE.equals(exists);
        } catch (RuntimeException ex) {
            log.warn("Failed to query JWT blacklist from Redis, falling back to local cache only: {}", ex.getMessage());
            return false;
        }
    }

    /**
     * Removes expired tokens from local memory.
     */
    @Scheduled(fixedDelayString = "${security.jwt.blacklist.cleanup-interval-ms:60000}")
    public void cleanupExpiredTokens() {
        Instant now = Instant.now(clock);

        for (Map.Entry<String, Instant> entry : blacklistedTokens.entrySet()) {
            if (!entry.getValue().isAfter(now)) {
                blacklistedTokens.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    int size() {
        return blacklistedTokens.size();
    }

    private boolean shouldUseRedis() {
        return redisEnabled && redisTemplate != null;
    }

    private String buildRedisKey(String token) {
        return REDIS_KEY_PREFIX + hashToken(token);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }
}
