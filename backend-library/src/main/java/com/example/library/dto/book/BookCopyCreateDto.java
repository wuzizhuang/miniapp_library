package com.example.library.dto.book;

import com.example.library.entity.BookCopy;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Book copy creation request DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookCopyCreateDto {
    @NotNull(message = "Book ID is required")
    private Integer bookId;

    private BookCopy.CopyStatus status = BookCopy.CopyStatus.AVAILABLE;
    private LocalDate acquisitionDate;
    private BigDecimal price;
    private String notes;
    private String locationCode;
    private String rfidTag;
    private Integer floorPlanId;
}
