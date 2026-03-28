package com.example.library.controller;

import com.example.library.dto.SeatReservationCreateDto;
import com.example.library.dto.SeatReservationDto;
import com.example.library.util.ControllerHelper;
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
 * 座位预约控制器。
 * 提供创建预约、查看我的预约和取消预约接口。
 */
@RestController
@RequestMapping("/api/seat-reservations")
@RequiredArgsConstructor
public class SeatReservationController {

    private final SeatReservationService seatReservationService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * 创建座位预约。
     */
    @PostMapping
    public ResponseEntity<SeatReservationDto> createReservation(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody SeatReservationCreateDto dto) {
        UserDetailsImpl authenticatedUser = ControllerHelper.requireAuthenticated(userDetails);
        requestRateLimitService.checkSeatReservationCreateLimit(request, authenticatedUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(seatReservationService.createReservation(authenticatedUser.getId(), dto));
    }

    /**
     * 查询当前用户的座位预约记录。
     */
    @GetMapping("/me")
    public ResponseEntity<List<SeatReservationDto>> getMyReservations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = ControllerHelper.requireAuthenticated(userDetails);
        return ResponseEntity.ok(seatReservationService.getMyReservations(authenticatedUser.getId()));
    }

    /**
     * 取消当前用户的一条座位预约。
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelReservation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer id) {
        UserDetailsImpl authenticatedUser = ControllerHelper.requireAuthenticated(userDetails);
        seatReservationService.cancelReservation(authenticatedUser.getId(), id);
        return ResponseEntity.noContent().build();
    }

}
