package com.example.library.service;

import com.example.library.dto.NotificationDto;
import com.example.library.entity.Notification;
import org.springframework.data.domain.Page;

/**
 * Notification service.
 */
public interface NotificationService {
    /**
     * Sends a notification to a user.
     */
    void sendNotification(Integer userId, Notification.NotificationType type, String title, String content);

    /**
     * Sends a notification to a user with deep-link metadata.
     */
    void sendNotification(
            Integer userId,
            Notification.NotificationType type,
            String title,
            String content,
            String targetType,
            String targetId,
            String routeHint,
            String businessKey);

    /**
     * Sends due-date reminder notifications.
     */
    void sendDueDateReminders();

    /**
     * Marks a notification as read (with ownership check).
     */
    void markAsRead(Long notificationId, Integer currentUserId);

    /**
     * Returns paged notifications for a user.
     */
    Page<NotificationDto> getNotificationsByUser(Integer userId, int page, int size);

    /**
     * Returns unread notification count for a user.
     */
    Long getUnreadCount(Integer userId);

    /**
     * Marks all notifications as read for a user.
     */
    void markAllAsRead(Integer userId);

    /**
     * Deletes a single notification (with ownership check).
     */
    void deleteNotification(Long notificationId, Integer userId);

    /**
     * Deletes all read notifications for a user.
     */
    void deleteAllRead(Integer userId);
}
