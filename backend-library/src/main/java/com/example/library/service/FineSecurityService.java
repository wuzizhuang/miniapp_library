package com.example.library.service;

import org.springframework.security.core.Authentication;

/**
 * Security checks for fine ownership.
 */
public interface FineSecurityService {

    /**
     * Returns true if the authenticated user owns the fine.
     */
    boolean isFineOwner(Authentication authentication, Integer fineId);
}
