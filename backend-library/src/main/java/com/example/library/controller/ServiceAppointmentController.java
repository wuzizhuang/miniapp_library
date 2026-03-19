package com.example.library.controller;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ServiceAppointmentCreateDto;
import com.example.library.dto.ServiceAppointmentDto;
import com.example.library.dto.ServiceAppointmentStatusUpdateDto;
import com.example.library.entity.ServiceAppointment;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.UserDetailsImpl;
import jakarta.servlet.http.HttpServletRequest;
import com.example.library.service.ServiceAppointmentService;
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
 * Endpoints for reader service appointments.
 */
@RestController
@RequestMapping("/api/service-appointments")
@RequiredArgsConstructor
public class ServiceAppointmentController {

    private final ServiceAppointmentService serviceAppointmentService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * Creates an appointment for the current user.
     */
    @PostMapping
    public ResponseEntity<ServiceAppointmentDto> createAppointment(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ServiceAppointmentCreateDto dto) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);
        requestRateLimitService.checkServiceAppointmentCreateLimit(request, authenticatedUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(serviceAppointmentService.createAppointment(authenticatedUser.getId(), dto));
    }

    /**
     * Returns the current user's appointments.
     */
    @GetMapping("/me")
    public ResponseEntity<Page<ServiceAppointmentDto>> getMyAppointments(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "scheduledTime"));
        return ResponseEntity.ok(serviceAppointmentService.getMyAppointments(authenticatedUser.getId(), pageable));
    }

    /**
     * Returns all appointments for admin workflow.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('appointment:manage')")
    public ResponseEntity<Page<ServiceAppointmentDto>> getAllAppointments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) ServiceAppointment.AppointmentStatus status,
            @RequestParam(required = false) String keyword) {
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "scheduledTime").and(Sort.by(Sort.Direction.DESC, "appointmentId")));
        return ResponseEntity.ok(serviceAppointmentService.getAllAppointments(status, keyword, pageable));
    }

    /**
     * Returns grouped service appointment counts by status.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('appointment:manage')")
    public ResponseEntity<java.util.List<DashboardBreakdownItemDto>> getAppointmentStats(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(serviceAppointmentService.getAppointmentStatusStats(keyword));
    }

    /**
     * Cancels one of the current user's appointments.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelAppointment(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer id) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);
        serviceAppointmentService.cancelAppointment(authenticatedUser.getId(), id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Updates appointment status from the admin workflow.
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('appointment:manage')")
    public ResponseEntity<ServiceAppointmentDto> updateAppointmentStatus(
            @PathVariable Integer id,
            @Valid @RequestBody ServiceAppointmentStatusUpdateDto dto) {
        return ResponseEntity.ok(serviceAppointmentService.updateAppointmentStatus(id, dto));
    }

    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
