package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 图书预约实体。
 * 表示读者对某本书发起的预约申请，以及从排队到待取书再到完成或过期的状态变化。
 */
@Entity
@Table(name = "reservations")
@Data
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Integer reservationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reservation_date", nullable = false)
    private LocalDate reservationDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReservationStatus status = ReservationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocated_copy_id")
    private BookCopy allocatedCopy;

    /** 待取书状态下的最晚取书时间。 */
    @Column(name = "pickup_deadline")
    private LocalDateTime pickupDeadline;

    /** 是否已经向读者发送过预约到书通知。 */
    @Column(name = "notification_sent")
    private Boolean notificationSent = false;

    /** 预约状态。 */
    public enum ReservationStatus {
        PENDING,
        AWAITING_PICKUP,
        FULFILLED,
        CANCELLED,
        EXPIRED
    }

}
