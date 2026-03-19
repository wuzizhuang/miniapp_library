package com.example.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Reservation creation request DTO.
 */
@Data
public class ReservationCreateDto {
    @NotNull(message = "Book ID is required")
    private Integer bookId;

    private Integer userId;
}
