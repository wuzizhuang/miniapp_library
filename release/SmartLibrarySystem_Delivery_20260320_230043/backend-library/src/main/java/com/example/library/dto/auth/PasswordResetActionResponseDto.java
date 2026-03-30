package com.example.library.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Generic response for password reset actions.
 */
@Data
@AllArgsConstructor
public class PasswordResetActionResponseDto {
    private String message;
    private String deliveryMethod;
    private Integer expiresInMinutes;
}
