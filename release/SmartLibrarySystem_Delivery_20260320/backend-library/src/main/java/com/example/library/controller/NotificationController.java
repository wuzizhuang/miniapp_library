package com.example.library.controller;

import com.example.library.dto.NotificationDto;
import com.example.library.exception.BadRequestException;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * User notification endpoints.
 * 注意：Spring Security 已在过滤器层保证了认证，userDetails 在此处不会为 null。
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Returns the current user's notifications (paged).
     */
    @GetMapping
    public ResponseEntity<Page<NotificationDto>> getMyNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(notificationService.getNotificationsByUser(requireUserId(userDetails), page, size));
    }

    /**
     * Returns the unread notification count for the current user.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(notificationService.getUnreadCount(requireUserId(userDetails)));
    }

    /**
     * Marks a single notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        notificationService.markAsRead(id, requireUserId(userDetails));
        return ResponseEntity.ok().build();
    }

    /**
     * Marks all notifications as read for the current user.
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.markAllAsRead(requireUserId(userDetails));
        return ResponseEntity.ok().build();
    }

    /**
     * Deletes a single notification (user must own it).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        notificationService.deleteNotification(id, requireUserId(userDetails));
        return ResponseEntity.noContent().build();
    }

    /**
     * Deletes all read notifications for the current user.
     */
    @DeleteMapping("/read")
    public ResponseEntity<Void> deleteAllRead(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.deleteAllRead(requireUserId(userDetails));
        return ResponseEntity.noContent().build();
    }

    private Integer requireUserId(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new BadRequestException("User context is missing");
        }
        return userDetails.getId();
    }
}
