package com.example.library.security;

import com.example.library.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed request rate limiter with in-memory fallback for high-risk endpoints.
 */
@Service
@Slf4j
public class RequestRateLimitService {

    private static final int LOGIN_MAX_REQUESTS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(10);

    private static final int REGISTER_MAX_REQUESTS = 3;
    private static final Duration REGISTER_WINDOW = Duration.ofMinutes(30);

    private static final int FORGOT_PASSWORD_MAX_REQUESTS = 3;
    private static final Duration FORGOT_PASSWORD_WINDOW = Duration.ofMinutes(30);

    private static final int RESET_PASSWORD_MAX_REQUESTS = 5;
    private static final Duration RESET_PASSWORD_WINDOW = Duration.ofMinutes(30);

    private static final int SEARCH_SUGGESTION_MAX_REQUESTS = 30;
    private static final Duration SEARCH_SUGGESTION_WINDOW = Duration.ofMinutes(1);

    private static final int BEHAVIOR_LOG_MAX_REQUESTS = 120;
    private static final Duration BEHAVIOR_LOG_WINDOW = Duration.ofMinutes(1);

    private static final int PUBLIC_AI_CHAT_MAX_REQUESTS = 8;
    private static final Duration PUBLIC_AI_CHAT_WINDOW = Duration.ofMinutes(1);

    private static final int SERVICE_APPOINTMENT_CREATE_MAX_REQUESTS = 6;
    private static final Duration SERVICE_APPOINTMENT_CREATE_WINDOW = Duration.ofMinutes(30);

    private static final int SEAT_RESERVATION_CREATE_MAX_REQUESTS = 8;
    private static final Duration SEAT_RESERVATION_CREATE_WINDOW = Duration.ofMinutes(30);

    private final StringRedisTemplate redisTemplate;
    private final boolean redisEnabled;
    private final Map<String, CounterWindow> counters = new ConcurrentHashMap<>();

    RequestRateLimitService() {
        this((StringRedisTemplate) null, false);
    }

    @Autowired
    public RequestRateLimitService(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider,
            @Value("${app.security.redis-enabled:false}") boolean redisEnabled) {
        this(redisTemplateProvider.getIfAvailable(), redisEnabled);
    }

    RequestRateLimitService(StringRedisTemplate redisTemplate, boolean redisEnabled) {
        this.redisTemplate = redisTemplate;
        this.redisEnabled = redisEnabled;
    }

    public void checkLoginLimit(HttpServletRequest request, String username) {
        enforceLimit(
                "auth:login",
                buildRequestIdentity(request, username),
                LOGIN_MAX_REQUESTS,
                LOGIN_WINDOW,
                "登录尝试过于频繁，请稍后再试");
    }

    public void checkRegisterLimit(HttpServletRequest request, String username, String email) {
        String subject = normalizeSegment(username) + "#" + normalizeSegment(email);
        enforceLimit(
                "auth:register",
                buildRequestIdentity(request, subject),
                REGISTER_MAX_REQUESTS,
                REGISTER_WINDOW,
                "注册请求过于频繁，请稍后再试");
    }

    public void checkForgotPasswordLimit(HttpServletRequest request, String email) {
        enforceLimit(
                "auth:forgot-password",
                buildRequestIdentity(request, email),
                FORGOT_PASSWORD_MAX_REQUESTS,
                FORGOT_PASSWORD_WINDOW,
                "找回密码请求过于频繁，请稍后再试");
    }

    public void checkResetPasswordLimit(HttpServletRequest request) {
        enforceLimit(
                "auth:reset-password",
                buildRequestIdentity(request, null),
                RESET_PASSWORD_MAX_REQUESTS,
                RESET_PASSWORD_WINDOW,
                "密码重置请求过于频繁，请稍后再试");
    }

    public void checkSearchSuggestionLimit(HttpServletRequest request) {
        enforceLimit(
                "search:suggestions",
                buildRequestIdentity(request, null),
                SEARCH_SUGGESTION_MAX_REQUESTS,
                SEARCH_SUGGESTION_WINDOW,
                "搜索联想请求过于频繁，请稍后再试");
    }

    public void checkBehaviorLogLimit(HttpServletRequest request, Integer userId) {
        String identity = userId == null ? null : "user-" + userId;
        enforceLimit(
                "behavior:log",
                buildRequestIdentity(request, identity),
                BEHAVIOR_LOG_MAX_REQUESTS,
                BEHAVIOR_LOG_WINDOW,
                "行为日志提交过于频繁，请稍后再试");
    }

    public void checkPublicAiChatLimit(HttpServletRequest request) {
        enforceLimit(
                "public:ai-chat",
                buildRequestIdentity(request, null),
                PUBLIC_AI_CHAT_MAX_REQUESTS,
                PUBLIC_AI_CHAT_WINDOW,
                "AI 对话请求过于频繁，请稍后再试");
    }

    public void checkServiceAppointmentCreateLimit(HttpServletRequest request, Integer userId) {
        String identity = userId == null ? null : "user-" + userId;
        enforceLimit(
                "service-appointment:create",
                buildRequestIdentity(request, identity),
                SERVICE_APPOINTMENT_CREATE_MAX_REQUESTS,
                SERVICE_APPOINTMENT_CREATE_WINDOW,
                "服务预约提交过于频繁，请稍后再试");
    }

    public void checkSeatReservationCreateLimit(HttpServletRequest request, Integer userId) {
        String identity = userId == null ? null : "user-" + userId;
        enforceLimit(
                "seat-reservation:create",
                buildRequestIdentity(request, identity),
                SEAT_RESERVATION_CREATE_MAX_REQUESTS,
                SEAT_RESERVATION_CREATE_WINDOW,
                "座位预约提交过于频繁，请稍后再试");
    }

    private void enforceLimit(String namespace, String identifier, int maxRequests, Duration window, String message) {
        String key = namespace + ":" + identifier;
        CounterWindow current;

        if (shouldUseRedis()) {
            try {
                current = incrementRedisCounter(key, window);
            } catch (RuntimeException ex) {
                log.warn("Redis rate limiting unavailable for key {}, falling back to in-memory counters: {}", key, ex.getMessage());
                current = incrementInMemoryCounter(key, window);
            }
        } else {
            current = incrementInMemoryCounter(key, window);
        }

        Instant now = Instant.now();
        if (current.count() > maxRequests) {
            long retryAfterSeconds = Math.max(Duration.between(now, current.resetAt()).toSeconds(), 1);
            throw new RateLimitExceededException(message, retryAfterSeconds);
        }
    }

    private CounterWindow incrementInMemoryCounter(String key, Duration window) {
        Instant now = Instant.now();

        return counters.compute(key, (ignored, existing) -> {
            if (existing == null || now.isAfter(existing.resetAt())) {
                return new CounterWindow(1, now.plus(window));
            }
            return new CounterWindow(existing.count() + 1, existing.resetAt());
        });
    }

    private CounterWindow incrementRedisCounter(String key, Duration window) {
        String redisKey = "ratelimit:" + key;
        redisTemplate.opsForValue().setIfAbsent(redisKey, "0", window);

        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count == null) {
            throw new IllegalStateException("Redis INCR did not return a value");
        }

        Long ttlSeconds = redisTemplate.getExpire(redisKey, TimeUnit.SECONDS);
        if (ttlSeconds == null || ttlSeconds <= 0) {
            redisTemplate.expire(redisKey, window);
            ttlSeconds = Math.max(window.toSeconds(), 1L);
        }

        return new CounterWindow(Math.toIntExact(count), Instant.now().plusSeconds(ttlSeconds));
    }

    private String buildRequestIdentity(HttpServletRequest request, String subject) {
        String clientIp = resolveClientIp(request);
        String normalizedSubject = normalizeSegment(subject);
        return normalizedSubject + "|" + clientIp;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.isBlank()) {
            return remoteAddr.trim();
        }

        return "unknown";
    }

    private String normalizeSegment(String value) {
        if (value == null) {
            return "anonymous";
        }

        String normalized = value.trim().toLowerCase();
        return normalized.isEmpty() ? "anonymous" : normalized;
    }

    @Scheduled(fixedDelayString = "${security.rate-limit.cleanup-interval-ms:60000}")
    void cleanupExpiredCounters() {
        Instant now = Instant.now();

        counters.entrySet().removeIf(entry -> now.isAfter(entry.getValue().resetAt()));
    }

    int getTrackedCounterCount() {
        return counters.size();
    }

    private boolean shouldUseRedis() {
        return redisEnabled && redisTemplate != null;
    }

    private record CounterWindow(int count, Instant resetAt) {
    }
}
