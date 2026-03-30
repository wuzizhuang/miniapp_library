package com.example.library.service;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ReservationCreateDto;
import com.example.library.dto.ReservationDto;
import com.example.library.entity.BookCopy;
import com.example.library.entity.Reservation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Reservation service.
 */
public interface ReservationService {
    /**
     * Creates a reservation.
     */
    ReservationDto createReservation(ReservationCreateDto createDto);

    /**
     * Cancels a reservation.
     */
    void cancelReservation(Integer reservationId);

    /**
     * Returns paginated reservations for a user.
     */
    Page<ReservationDto> getUserReservations(Integer userId, Pageable pageable);

    /**
     * Returns paginated reservations for admin.
     */
    Page<ReservationDto> getAllReservations(Reservation.ReservationStatus status, Pageable pageable);

    /**
     * Returns paginated reservations for admin with keyword search.
     */
    Page<ReservationDto> getAllReservations(Reservation.ReservationStatus status, String keyword, Pageable pageable);

    /**
     * Returns grouped admin reservation counts by status.
     */
    List<DashboardBreakdownItemDto> getReservationStatusStats(String keyword);

    /**
     * Allocates a returned copy to the next pending reservation.
     */
    boolean allocateInventoryForPendingReservations(BookCopy bookCopy);

    /**
     * Marks a reservation as fulfilled.
     */
    void fulfillReservation(Integer reservationId);

    /**
     * Expires overdue reservations and releases inventory.
     */
    void checkAndExpireReservations();
}
