package com.example.library.controller;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ReservationCreateDto;
import com.example.library.dto.ReservationDto;
import com.example.library.entity.Reservation;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Reservation endpoints for requesting and managing holds.
 */
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    /**
     * Creates a reservation for the current user.
     */
    @PostMapping
    public ResponseEntity<ReservationDto> createReservation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ReservationCreateDto createDto) {
        createDto.setUserId(userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationService.createReservation(createDto));
    }

    /**
     * Returns the current user's reservations (paginated).
     */
    @GetMapping("/me")
    public ResponseEntity<Page<ReservationDto>> getMyReservations(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reservationDate"));
        return ResponseEntity.ok(reservationService.getUserReservations(userDetails.getId(), pageable));
    }

    /**
     * Returns all reservations for admin.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage')")
    public ResponseEntity<Page<ReservationDto>> getAllReservations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Reservation.ReservationStatus status,
            @RequestParam(required = false) String keyword) {
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "reservationDate").and(Sort.by(Sort.Direction.DESC, "reservationId")));
        return ResponseEntity.ok(reservationService.getAllReservations(status, keyword, pageable));
    }

    /**
     * Returns reservation status statistics for the admin dashboard.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage')")
    public ResponseEntity<java.util.List<DashboardBreakdownItemDto>> getReservationStats(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(reservationService.getReservationStatusStats(keyword));
    }

    /**
     * Cancels a reservation (admin or reservation owner only).
     */
    @PutMapping("/{reservationId}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage') or @reservationSecurityService.isReservationOwner(authentication, #reservationId)")
    public ResponseEntity<Void> cancelReservation(@PathVariable Integer reservationId) {
        reservationService.cancelReservation(reservationId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Forces a reservation to be fulfilled (admin only).
     */
    @PutMapping("/{reservationId}/fulfill")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage')")
    public ResponseEntity<Void> fulfillReservation(@PathVariable Integer reservationId) {
        reservationService.fulfillReservation(reservationId);
        return ResponseEntity.noContent().build();
    }
}
