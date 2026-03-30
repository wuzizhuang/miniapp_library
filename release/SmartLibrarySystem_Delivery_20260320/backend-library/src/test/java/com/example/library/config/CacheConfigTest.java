package com.example.library.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("CacheConfig 单元测试")
@SuppressWarnings("deprecation")
class CacheConfigTest {

    private final CacheConfig cacheConfig = new CacheConfig();

    @Test
    @DisplayName("禁用 Redis cache 时返回 NoOpCacheManager")
    void noOpCacheManagerWhenRedisCacheDisabled() {
        CacheManager cacheManager = cacheConfig.noOpCacheManager();

        assertThat(cacheManager).isInstanceOf(NoOpCacheManager.class);
    }

    @Test
    @DisplayName("启用 Redis cache 时按预期注册 TTL")
    void redisCacheManagerRegistersNamedCachesWithExpectedTtl() {
        RedisConnectionFactory redisConnectionFactory = mock(RedisConnectionFactory.class);

        CacheManager cacheManager = cacheConfig.redisCacheManager(
                redisConnectionFactory,
                Duration.ofMinutes(2),
                Duration.ofSeconds(30),
                Duration.ofSeconds(45));

        assertThat(cacheManager).isInstanceOf(RedisCacheManager.class);

        @SuppressWarnings("unchecked")
        Map<String, RedisCacheConfiguration> cacheConfigurations =
                (Map<String, RedisCacheConfiguration>) ReflectionTestUtils.getField(
                        cacheManager,
                        "initialCacheConfiguration");

        assertThat(cacheConfigurations)
                .containsKeys(
                        CacheConfig.SEARCH_HOT_KEYWORDS_CACHE,
                        CacheConfig.DASHBOARD_STATS_CACHE,
                        CacheConfig.DASHBOARD_ANALYTICS_CACHE);
        assertThat(cacheConfigurations.get(CacheConfig.SEARCH_HOT_KEYWORDS_CACHE).getTtl())
                .isEqualTo(Duration.ofMinutes(2));
        assertThat(cacheConfigurations.get(CacheConfig.DASHBOARD_STATS_CACHE).getTtl())
                .isEqualTo(Duration.ofSeconds(30));
        assertThat(cacheConfigurations.get(CacheConfig.DASHBOARD_ANALYTICS_CACHE).getTtl())
                .isEqualTo(Duration.ofSeconds(45));
    }
}
