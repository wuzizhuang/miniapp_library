package com.example.library.controller;

import com.example.library.dto.SeatReservationCreateDto;
import com.example.library.dto.SeatReservationDto;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.SeatReservationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Reader seat reservation endpoints.
 */
@RestController
@RequestMapping("/api/seat-reservations")
@RequiredArgsConstructor
public class SeatReservationController {

    private final SeatReservationService seatReservationService;
    private final RequestRateLimitService requestRateLimitService;

    @PostMapping
    public ResponseEntity<SeatReservationDto> createReservation(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody SeatReservationCreateDto dto) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);
        requestRateLimitService.checkSeatReservationCreateLimit(request, authenticatedUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(seatReservationService.createReservation(authenticatedUser.getId(), dto));
    }

    @GetMapping("/me")
    public ResponseEntity<List<SeatReservationDto>> getMyReservations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);
        return ResponseEntity.ok(seatReservationService.getMyReservations(authenticatedUser.getId()));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelReservation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer id) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);
        seatReservationService.cancelReservation(authenticatedUser.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
