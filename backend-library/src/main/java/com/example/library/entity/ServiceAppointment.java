package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 服务预约实体。
 * 表示读者预约到馆服务、还书审核或咨询服务的记录。
 */
@Entity
@Table(name = "service_appointments")
@Data
public class ServiceAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "appointment_id")
    private Integer appointmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id")
    private Loan loan;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false)
    private ServiceType serviceType;

    @Column(name = "scheduled_time", nullable = false)
    private LocalDateTime scheduledTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "method")
    private ServiceMethod method = ServiceMethod.COUNTER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Column(name = "notes")
    private String notes;

    @Column(name = "return_location", length = 120)
    private String returnLocation;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    /** 服务预约类型。 */
    public enum ServiceType {
        RETURN_BOOK, PICKUP_BOOK, CONSULTATION
    }

    /** 服务办理方式。 */
    public enum ServiceMethod {
        COUNTER, SMART_LOCKER
    }

    /** 服务预约处理状态。 */
    public enum AppointmentStatus {
        PENDING, COMPLETED, CANCELLED, MISSED
    }
}
