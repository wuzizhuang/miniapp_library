package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Library seat resource for reader booking.
 */
@Entity
@Table(name = "seats")
@Getter
@Setter
@ToString
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "seat_id")
    private Integer seatId;

    @Column(name = "seat_code", nullable = false, unique = true, length = 32)
    private String seatCode;

    @Column(name = "floor_name", nullable = false, length = 50)
    private String floorName;

    @Column(name = "floor_order", nullable = false)
    private Integer floorOrder = 1;

    @Column(name = "zone_name", length = 50)
    private String zoneName;

    @Column(name = "area_name", length = 50)
    private String areaName;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", nullable = false, length = 20)
    private SeatType seatType = SeatType.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @Column(name = "has_power", nullable = false)
    private Boolean hasPower = false;

    @Column(name = "near_window", nullable = false)
    private Boolean nearWindow = false;

    @Column(name = "description", length = 255)
    private String description;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    @OneToMany(mappedBy = "seat")
    @ToString.Exclude
    private Set<SeatReservation> reservations = new HashSet<>();

    public enum SeatType {
        STANDARD, COMPUTER, DISCUSSION
    }

    public enum SeatStatus {
        AVAILABLE, UNAVAILABLE
    }
}
