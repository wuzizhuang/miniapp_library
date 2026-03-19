package com.example.library.exception;

/**
 * Raised when a dependent service is unavailable or not configured.
 */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
