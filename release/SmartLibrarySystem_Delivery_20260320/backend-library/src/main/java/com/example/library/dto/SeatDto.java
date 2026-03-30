package com.example.library.dto;

import com.example.library.entity.Seat;
import lombok.Data;

/**
 * Seat resource DTO.
 */
@Data
public class SeatDto {
    private Integer seatId;
    private String seatCode;
    private String floorName;
    private Integer floorOrder;
    private String zoneName;
    private String areaName;
    private Seat.SeatType seatType;
    private Seat.SeatStatus status;
    private Boolean hasPower;
    private Boolean nearWindow;
    private String description;
    private Boolean available;
}
