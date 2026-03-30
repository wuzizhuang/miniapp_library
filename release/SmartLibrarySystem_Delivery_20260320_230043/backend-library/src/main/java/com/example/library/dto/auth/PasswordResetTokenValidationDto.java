package com.example.library.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Token validation result for reset-password flow.
 */
@Data
@AllArgsConstructor
public class PasswordResetTokenValidationDto {
    private boolean valid;
    private String message;
}
