package com.example.library.dto;

import com.example.library.entity.Notification;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Notification response DTO.
 */
@Data
public class NotificationDto {
    private Long notificationId;
    private Notification.NotificationType type;
    private String title;
    private String content;
    private Boolean isRead;
    private LocalDateTime sendTime;
    private Long relatedEntityId;
    private String targetType;
    private String targetId;
    private String routeHint;
    private String businessKey;
}
