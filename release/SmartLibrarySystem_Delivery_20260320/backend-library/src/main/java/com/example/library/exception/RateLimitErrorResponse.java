package com.example.library.exception;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * Error payload for 429 responses.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RateLimitErrorResponse extends ErrorResponse {

    private String code;
    private long retryAfterSeconds;

    public RateLimitErrorResponse(
            LocalDateTime timestamp,
            int status,
            String error,
            String message,
            String path,
            String code,
            long retryAfterSeconds) {
        super(timestamp, status, error, message, path);
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
