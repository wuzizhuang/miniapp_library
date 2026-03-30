package com.example.library.service;

import org.springframework.security.core.Authentication;

/**
 * Security checks for reservation ownership.
 */
public interface ReservationSecurityService {

    /**
     * Returns true if the authenticated user owns the reservation.
     */
    boolean isReservationOwner(Authentication authentication, Integer reservationId);
}
