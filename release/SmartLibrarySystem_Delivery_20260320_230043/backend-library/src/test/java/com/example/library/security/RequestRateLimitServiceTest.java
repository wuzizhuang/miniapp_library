package com.example.library.security;

import com.example.library.exception.RateLimitExceededException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link RequestRateLimitService}.
 */
@DisplayName("RequestRateLimitService 单元测试")
class RequestRateLimitServiceTest {

    @Test
    @DisplayName("登录在窗口内超过阈值时抛出 429")
    void loginLimitExceededAfterThreshold() {
        RequestRateLimitService service = new RequestRateLimitService();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        for (int index = 0; index < 5; index++) {
            service.checkLoginLimit(request, "admin");
        }

        assertThatThrownBy(() -> service.checkLoginLimit(request, "admin"))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(ex -> assertThat(((RateLimitExceededException) ex).getRetryAfterSeconds()).isPositive());
    }

    @Test
    @DisplayName("不同请求身份使用独立限流桶")
    void differentIdentityUsesDifferentBuckets() {
        RequestRateLimitService service = new RequestRateLimitService();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        for (int index = 0; index < 5; index++) {
            service.checkLoginLimit(request, "admin");
        }

        service.checkLoginLimit(request, "librarian");
    }

    @Test
    @DisplayName("注册在窗口内超过阈值时抛出 429")
    void registerLimitExceededAfterThreshold() {
        RequestRateLimitService service = new RequestRateLimitService();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        for (int index = 0; index < 3; index++) {
            service.checkRegisterLimit(request, "new-user", "new-user@example.com");
        }

        assertThatThrownBy(() -> service.checkRegisterLimit(request, "new-user", "new-user@example.com"))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(ex -> assertThat(((RateLimitExceededException) ex).getRetryAfterSeconds()).isPositive());
    }

    @Test
    @DisplayName("服务预约在窗口内超过阈值时抛出 429")
    void serviceAppointmentLimitExceededAfterThreshold() {
        RequestRateLimitService service = new RequestRateLimitService();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        for (int index = 0; index < 6; index++) {
            service.checkServiceAppointmentCreateLimit(request, 7);
        }

        assertThatThrownBy(() -> service.checkServiceAppointmentCreateLimit(request, 7))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(ex -> assertThat(((RateLimitExceededException) ex).getRetryAfterSeconds()).isPositive());
    }

    @Test
    @DisplayName("清理任务会移除已过期限流桶")
    void cleanupRemovesExpiredCounters() throws Exception {
        RequestRateLimitService service = new RequestRateLimitService();
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> counters =
                (java.util.Map<String, Object>) ReflectionTestUtils.getField(service, "counters");

        assertThat(counters).isNotNull();
        Class<?> counterWindowClass = Class.forName(
                "com.example.library.security.RequestRateLimitService$CounterWindow");
        java.lang.reflect.Constructor<?> constructor =
                counterWindowClass.getDeclaredConstructor(int.class, java.time.Instant.class);
        constructor.setAccessible(true);
        Object expiredWindow = constructor.newInstance(1, java.time.Instant.now().minusSeconds(10));
        counters.put("expired-key", expiredWindow);

        service.cleanupExpiredCounters();

        assertThat(service.getTrackedCounterCount()).isZero();
    }

    @Test
    @DisplayName("启用 Redis 时优先使用 Redis 计数器")
    void usesRedisCountersWhenEnabled() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        RequestRateLimitService service = new RequestRateLimitService(redisTemplate, true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), eq("0"), any(Duration.class))).thenReturn(true);
        when(valueOperations.increment(anyString())).thenReturn(1L, 2L, 3L, 4L, 5L, 6L);
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS))).thenReturn(600L);

        for (int index = 0; index < 5; index++) {
            service.checkLoginLimit(request, "admin");
        }

        assertThatThrownBy(() -> service.checkLoginLimit(request, "admin"))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(ex -> assertThat(((RateLimitExceededException) ex).getRetryAfterSeconds()).isPositive());

        verify(redisTemplate, atLeastOnce()).opsForValue();
        verify(valueOperations, atLeastOnce()).setIfAbsent(anyString(), eq("0"), any(Duration.class));
        verify(valueOperations, atLeastOnce()).increment(anyString());
    }
}
