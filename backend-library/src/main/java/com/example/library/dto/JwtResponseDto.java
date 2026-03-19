package com.example.library.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.List;

/**
 * JWT response DTO.
 */
@Data
@NoArgsConstructor
public class JwtResponseDto {
    private String token;
    private String tokenType = "Bearer";
    private Integer userId;
    private String username;
    private String role;
    private List<String> roles = new ArrayList<>();
    private List<String> permissions = new ArrayList<>();
    private String refreshToken;
    private LocalDateTime refreshTokenExpiresAt;

    public JwtResponseDto(String token, Integer userId, String username, String role) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.role = role;
    }

    public JwtResponseDto(
            String token,
            Integer userId,
            String username,
            String role,
            List<String> roles,
            List<String> permissions) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.roles = roles == null ? new ArrayList<>() : roles;
        this.permissions = permissions == null ? new ArrayList<>() : permissions;
    }

    public JwtResponseDto(
            String token,
            Integer userId,
            String username,
            String role,
            List<String> roles,
            List<String> permissions,
            String refreshToken,
            LocalDateTime refreshTokenExpiresAt) {
        this(token, userId, username, role, roles, permissions);
        this.refreshToken = refreshToken;
        this.refreshTokenExpiresAt = refreshTokenExpiresAt;
    }
}
