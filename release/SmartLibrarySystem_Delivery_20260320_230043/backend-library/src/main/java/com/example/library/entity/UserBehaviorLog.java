package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 用户行为日志实体。
 * 用于记录图书浏览、加书架、分享、借阅点击等行为事件。
 */
@Entity
@Table(name = "user_behavior_logs")
@Data
public class UserBehaviorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "book_id")
    private Integer bookId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ActionType actionType;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "device_type", length = 50)
    private String deviceType;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    /** 行为类型。 */
    public enum ActionType {
        VIEW_DETAIL, ADD_TO_SHELF, CLICK_PREVIEW, SHARE, BORROW_BOOK, RESERVE_BOOK
    }
}
