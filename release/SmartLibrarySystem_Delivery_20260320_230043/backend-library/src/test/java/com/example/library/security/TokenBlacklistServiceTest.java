package com.example.library.security;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TokenBlacklistServiceTest {

    @Test
    void blacklistedTokenRemainsBlockedUntilExpiry() {
        Instant now = Instant.parse("2026-03-06T00:00:00Z");
        TokenBlacklistService service = new TokenBlacklistService(Clock.fixed(now, ZoneOffset.UTC));

        service.blacklistToken("jwt-1", now.plusSeconds(120));

        assertThat(service.isBlacklisted("jwt-1")).isTrue();
    }

    @Test
    void expiredTokenIsIgnoredAndRemoved() {
        Instant now = Instant.parse("2026-03-06T00:00:00Z");
        TokenBlacklistService service = new TokenBlacklistService(Clock.fixed(now, ZoneOffset.UTC));

        service.blacklistToken("jwt-2", now.minusSeconds(1));

        assertThat(service.isBlacklisted("jwt-2")).isFalse();
        assertThat(service.size()).isZero();
    }

    @Test
    void blacklistedTokenIsPersistedToRedisWhenEnabled() {
        Instant now = Instant.parse("2026-03-06T00:00:00Z");
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        TokenBlacklistService service = new TokenBlacklistService(
                redisTemplate,
                true,
                Clock.fixed(now, ZoneOffset.UTC));

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        service.blacklistToken("jwt-redis", now.plusSeconds(120));

        verify(valueOperations).set(
                argThat(key -> key.startsWith("security:jwt:blacklist:") && !key.contains("jwt-redis")),
                any(String.class),
                any(java.time.Duration.class));
        assertThat(service.isBlacklisted("jwt-redis")).isTrue();
    }

    @Test
    void redisBlacklistEntryIsHonoredWhenLocalCacheMisses() {
        Instant now = Instant.parse("2026-03-06T00:00:00Z");
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        TokenBlacklistService service = new TokenBlacklistService(
                redisTemplate,
                true,
                Clock.fixed(now, ZoneOffset.UTC));

        when(redisTemplate.hasKey(anyString())).thenReturn(true);

        assertThat(service.isBlacklisted("jwt-redis-only")).isTrue();
        verify(redisTemplate).hasKey(argThat(key -> key.startsWith("security:jwt:blacklist:")));
    }
}
