package com.example.library.dto.book;

import com.example.library.entity.BookCopy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Book copy update request DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookCopyUpdateDto {
    private BookCopy.CopyStatus status;
    private LocalDate acquisitionDate;
    private BigDecimal price;
    private String notes;
    private String locationCode;
    private String rfidTag;
    private Integer floorPlanId;
}
