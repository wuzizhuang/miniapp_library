package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * User feedback ticket entity.
 */
@Entity
@Table(name = "user_feedbacks")
@Getter
@Setter
@ToString
public class UserFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedback_id")
    private Long feedbackId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private FeedbackCategory category = FeedbackCategory.OTHER;

    @Column(name = "subject", nullable = false, length = 150)
    private String subject;

    @Lob
    @Column(name = "content", nullable = false, length = 10000)
    private String content;

    @Column(name = "contact_email", length = 120)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FeedbackStatus status = FeedbackStatus.SUBMITTED;

    @Lob
    @Column(name = "admin_reply", length = 10000)
    private String adminReply;

    @Column(name = "handled_by", length = 50)
    private String handledBy;

    @Column(name = "reply_time")
    private LocalDateTime replyTime;

    @OneToMany(mappedBy = "feedback", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createTime ASC, messageId ASC")
    @ToString.Exclude
    private List<UserFeedbackMessage> messages = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    public enum FeedbackCategory {
        BOOK_INFO, SYSTEM_BUG, SERVICE_EXPERIENCE, SUGGESTION, OTHER
    }

    public enum FeedbackStatus {
        SUBMITTED, IN_PROGRESS, RESOLVED, REJECTED
    }

    public void addMessage(UserFeedbackMessage message) {
        messages.add(message);
        message.setFeedback(this);
    }
}
