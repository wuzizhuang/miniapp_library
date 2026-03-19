package com.example.library.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;

/**
 * Factory for consistent API error payloads.
 */
public final class ApiErrorResponseFactory {

    private static final String URI_PREFIX = "uri=";

    private ApiErrorResponseFactory() {
    }

    public static ErrorResponse build(HttpStatus status, String error, String message, WebRequest request) {
        return new ErrorResponse(
                LocalDateTime.now(),
                status.value(),
                error,
                message,
                extractPath(request));
    }

    public static ErrorResponse build(HttpStatus status, String error, String message, HttpServletRequest request) {
        return new ErrorResponse(
                LocalDateTime.now(),
                status.value(),
                error,
                message,
                request.getRequestURI());
    }

    public static String extractPath(WebRequest request) {
        String description = request.getDescription(false);
        if (description != null && description.startsWith(URI_PREFIX)) {
            return description.substring(URI_PREFIX.length());
        }
        return description;
    }
}
