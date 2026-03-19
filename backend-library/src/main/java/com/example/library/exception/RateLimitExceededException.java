package com.example.library.exception;

/**
 * Raised when a request exceeds the configured rate limit.
 */
public class RateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;
    private final String code;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        this(message, retryAfterSeconds, "RATE_LIMIT_EXCEEDED");
    }

    public RateLimitExceededException(String message, long retryAfterSeconds, String code) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
        this.code = code;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public String getCode() {
        return code;
    }
}
