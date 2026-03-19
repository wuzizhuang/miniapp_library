package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Notification entity.
 */
@Entity
@Table(
        name = "notifications",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_notification_user_business_key", columnNames = { "user_id", "business_key" })
        })
@Data
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Lob
    @Column(length = 10000)
    private String content;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "send_time", nullable = false, updatable = false)
    private LocalDateTime sendTime;

    @Column(name = "target_type", length = 30)
    private String targetType;

    @Column(name = "target_id", length = 50)
    private String targetId;

    @Column(name = "route_hint", length = 255)
    private String routeHint;

    @Column(name = "business_key", length = 80)
    private String businessKey;

    public enum NotificationType {
        DUE_REMINDER, ARRIVAL_NOTICE, NEW_BOOK_RECOMMEND, SYSTEM
    }
}
