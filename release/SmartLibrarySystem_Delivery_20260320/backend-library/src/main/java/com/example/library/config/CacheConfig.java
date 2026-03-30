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

@Configuration
@EnableCaching
public class CacheConfig {

    public static final String SEARCH_HOT_KEYWORDS_CACHE = "searchHotKeywords";
    public static final String DASHBOARD_STATS_CACHE = "dashboardStats";
    public static final String DASHBOARD_ANALYTICS_CACHE = "dashboardAnalytics";

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

    @Bean
    @ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "false", matchIfMissing = true)
    public CacheManager noOpCacheManager() {
        return new NoOpCacheManager();
    }
}
