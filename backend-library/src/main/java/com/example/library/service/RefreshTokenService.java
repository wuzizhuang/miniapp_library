package com.example.library.service;

import com.example.library.dto.JwtResponseDto;

/**
 * Refresh token lifecycle service.
 */
public interface RefreshTokenService {

    JwtResponseDto issueSession(Integer userId, String username);

    JwtResponseDto refreshSession(String rawRefreshToken);

    void revokeRefreshToken(String rawRefreshToken);

    void revokeAllUserTokens(Integer userId);
}
