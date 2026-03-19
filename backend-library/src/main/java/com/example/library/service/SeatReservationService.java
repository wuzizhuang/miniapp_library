package com.example.library.service;

import com.example.library.dto.SeatDto;
import com.example.library.dto.SeatReservationCreateDto;
import com.example.library.dto.SeatReservationDto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Reader seat reservation service.
 */
public interface SeatReservationService {
    /**
     * Returns seats with optional availability calculation in the requested window.
     */
    List<SeatDto> getSeats(String floorName, String zoneName, LocalDateTime startTime, LocalDateTime endTime, boolean availableOnly);

    /**
     * Creates a seat reservation.
     */
    SeatReservationDto createReservation(Integer userId, SeatReservationCreateDto dto);

    /**
     * Returns current user's seat reservations.
     */
    List<SeatReservationDto> getMyReservations(Integer userId);

    /**
     * Cancels one of the current user's seat reservations.
     */
    void cancelReservation(Integer userId, Integer reservationId);
}
