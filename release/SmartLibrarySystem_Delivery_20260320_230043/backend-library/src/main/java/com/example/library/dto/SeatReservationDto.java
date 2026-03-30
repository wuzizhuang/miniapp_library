package com.example.library.dto;

import com.example.library.entity.Seat;
import com.example.library.entity.SeatReservation;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Seat reservation response DTO.
 */
@Data
public class SeatReservationDto {
    private Integer reservationId;
    private Integer userId;
    private String username;
    private String userFullName;
    private Integer seatId;
    private String seatCode;
    private String floorName;
    private String zoneName;
    private String areaName;
    private Seat.SeatType seatType;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private SeatReservation.ReservationStatus status;
    private String notes;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
