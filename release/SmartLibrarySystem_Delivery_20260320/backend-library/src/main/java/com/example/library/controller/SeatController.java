package com.example.library.controller;

import com.example.library.dto.SeatDto;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.SeatReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Seat browsing endpoints for readers.
 */
@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatReservationService seatReservationService;

    @GetMapping
    public ResponseEntity<List<SeatDto>> getSeats(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) String floorName,
            @RequestParam(required = false) String zoneName,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "false") boolean availableOnly) {
        requireAuthenticatedUser(userDetails);
        return ResponseEntity.ok(seatReservationService.getSeats(floorName, zoneName, startTime, endTime, availableOnly));
    }

    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
