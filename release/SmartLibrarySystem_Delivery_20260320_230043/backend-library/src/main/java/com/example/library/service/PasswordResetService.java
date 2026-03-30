package com.example.library.service;

import com.example.library.dto.auth.PasswordResetActionResponseDto;
import com.example.library.dto.auth.PasswordResetTokenValidationDto;

/**
 * Password reset workflow service.
 */
public interface PasswordResetService {

    PasswordResetActionResponseDto requestPasswordReset(String email);

    PasswordResetTokenValidationDto validateResetToken(String token);

    PasswordResetActionResponseDto resetPassword(String token, String newPassword);
}
