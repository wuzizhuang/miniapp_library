package com.example.library.exception;

/**
 * Raised when the current request requires authentication but no user is available.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
