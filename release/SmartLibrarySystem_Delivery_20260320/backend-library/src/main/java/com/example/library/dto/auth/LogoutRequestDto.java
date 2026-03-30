package com.example.library.dto.auth;

import lombok.Data;

/**
 * Logout request payload.
 */
@Data
public class LogoutRequestDto {

    private String refreshToken;
}
