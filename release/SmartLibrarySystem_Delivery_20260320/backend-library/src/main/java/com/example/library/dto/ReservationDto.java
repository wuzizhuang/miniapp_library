package com.example.library.dto;

import com.example.library.entity.Reservation;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Reservation response DTO.
 */
@Data
public class ReservationDto {
    private Integer reservationId;
    private Integer bookId;
    private String bookTitle;
    private String bookIsbn;
    private String coverUrl;
    private Integer userId;
    private String username;
    private String userFullName;

    private Integer allocatedCopyId;
    private String locationCode;
    private Integer queuePosition;
    private LocalDateTime pickupDeadline;
    private Boolean notificationSent;
    private LocalDate reservationDate;
    private LocalDate expiryDate;
    private Reservation.ReservationStatus status;
}
