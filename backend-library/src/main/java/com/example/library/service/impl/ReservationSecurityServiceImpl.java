package com.example.library.service.impl;

import com.example.library.entity.Reservation;
import com.example.library.repository.ReservationRepository;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.ReservationSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Checks whether the authenticated user owns a reservation record.
 */
@Service
@RequiredArgsConstructor
public class ReservationSecurityServiceImpl implements ReservationSecurityService {
    private final ReservationRepository reservationRepository;

    @Override
    public boolean isReservationOwner(Authentication authentication, Integer reservationId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            return false;
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        Integer userId = userDetails.getId();

        Optional<Reservation> reservationOpt = reservationRepository.findById(reservationId);
        if (reservationOpt.isEmpty()) {
            return false;
        }

        return reservationOpt.get().getUser().getUserId().equals(userId);
    }
}
