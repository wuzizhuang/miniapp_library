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
 * 预约控制器。
 * 负责读者预约、预约取消、管理员履约以及预约统计等接口。
 */
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    /**
     * 为当前登录用户创建预约。
     */
    @PostMapping
    public ResponseEntity<ReservationDto> createReservation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ReservationCreateDto createDto) {
        createDto.setUserId(userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationService.createReservation(createDto));
    }

    /**
     * 分页查询当前用户的预约记录。
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
     * 分页查询全部预约记录。
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
     * 查询预约状态统计数据。
     * 供后台看板展示不同预约状态的分布情况。
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage')")
    public ResponseEntity<java.util.List<DashboardBreakdownItemDto>> getReservationStats(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(reservationService.getReservationStatusStats(keyword));
    }

    /**
     * 取消预约。
     * 仅管理员、预约管理角色或预约本人可操作。
     */
    @PutMapping("/{reservationId}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage') or @reservationSecurityService.isReservationOwner(authentication, #reservationId)")
    public ResponseEntity<Void> cancelReservation(@PathVariable Integer reservationId) {
        reservationService.cancelReservation(reservationId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 将预约直接履约为借阅。
     * 仅管理员或预约管理角色可操作。
     */
    @PutMapping("/{reservationId}/fulfill")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('reservation:manage')")
    public ResponseEntity<Void> fulfillReservation(@PathVariable Integer reservationId) {
        reservationService.fulfillReservation(reservationId);
        return ResponseEntity.noContent().build();
    }
}
