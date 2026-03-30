package com.example.library.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Refresh token request payload.
 */
@Data
public class RefreshTokenRequestDto {

    @NotBlank
    private String refreshToken;
}
