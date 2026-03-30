package com.example.library.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

import java.time.Duration;
import java.util.Map;

/**
 * 缓存配置类。
 * 根据配置决定启用 Redis 缓存，还是退化为无操作缓存实现。
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /** 搜索热词缓存名称。 */
    public static final String SEARCH_HOT_KEYWORDS_CACHE = "searchHotKeywords";
    /** 仪表盘统计卡片缓存名称。 */
    public static final String DASHBOARD_STATS_CACHE = "dashboardStats";
    /** 仪表盘分析图表缓存名称。 */
    public static final String DASHBOARD_ANALYTICS_CACHE = "dashboardAnalytics";

    /**
     * 创建 Redis 缓存管理器，并为不同缓存空间配置独立过期时间。
     */
    @Bean
    @ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "true")
    public CacheManager redisCacheManager(
            RedisConnectionFactory redisConnectionFactory,
            @Value("${app.cache.hot-keywords-ttl:PT2M}") Duration hotKeywordsTtl,
            @Value("${app.cache.dashboard-stats-ttl:PT30S}") Duration dashboardStatsTtl,
            @Value("${app.cache.dashboard-analytics-ttl:PT45S}") Duration dashboardAnalyticsTtl) {
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeValuesWith(SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer().configure(mapper -> {
                            mapper.findAndRegisterModules();
                            mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
                        })))
                .computePrefixWith(cacheName -> "library:cache:" + cacheName + ":");

        Map<String, RedisCacheConfiguration> cacheConfigurations = Map.of(
                SEARCH_HOT_KEYWORDS_CACHE, defaults.entryTtl(hotKeywordsTtl),
                DASHBOARD_STATS_CACHE, defaults.entryTtl(dashboardStatsTtl),
                DASHBOARD_ANALYTICS_CACHE, defaults.entryTtl(dashboardAnalyticsTtl));

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaults.entryTtl(Duration.ofSeconds(30)))
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware()
                .build();
    }

    /**
     * 当 Redis 缓存关闭时，返回空实现，避免业务代码因缺少缓存组件而报错。
     */
    @Bean
    @ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "false", matchIfMissing = true)
    public CacheManager noOpCacheManager() {
        return new NoOpCacheManager();
    }
}
