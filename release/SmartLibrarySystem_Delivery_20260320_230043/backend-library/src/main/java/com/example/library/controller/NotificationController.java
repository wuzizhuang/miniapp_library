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
 * 通知控制器。
 * 负责用户消息列表、已读状态维护和通知清理等接口。
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 分页查询当前用户的通知列表。
     */
    @GetMapping
    public ResponseEntity<Page<NotificationDto>> getMyNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(notificationService.getNotificationsByUser(requireUserId(userDetails), page, size));
    }

    /**
     * 查询当前用户的未读通知数量。
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(notificationService.getUnreadCount(requireUserId(userDetails)));
    }

    /**
     * 将单条通知标记为已读。
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        notificationService.markAsRead(id, requireUserId(userDetails));
        return ResponseEntity.ok().build();
    }

    /**
     * 将当前用户的全部通知标记为已读。
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.markAllAsRead(requireUserId(userDetails));
        return ResponseEntity.ok().build();
    }

    /**
     * 删除单条通知。
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long id) {
        notificationService.deleteNotification(id, requireUserId(userDetails));
        return ResponseEntity.noContent().build();
    }

    /**
     * 删除当前用户全部已读通知。
     */
    @DeleteMapping("/read")
    public ResponseEntity<Void> deleteAllRead(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.deleteAllRead(requireUserId(userDetails));
        return ResponseEntity.noContent().build();
    }

    /**
     * 从认证上下文中提取当前用户 ID。
     */
    private Integer requireUserId(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new BadRequestException("User context is missing");
        }
        return userDetails.getId();
    }
}
