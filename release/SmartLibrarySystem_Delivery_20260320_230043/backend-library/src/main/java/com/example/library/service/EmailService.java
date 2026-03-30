package com.example.library.service;

/**
 * Outbound email delivery service.
 */
public interface EmailService {

    void sendPasswordResetEmail(String toEmail, String username, String resetUrl, int expirationMinutes);
}
