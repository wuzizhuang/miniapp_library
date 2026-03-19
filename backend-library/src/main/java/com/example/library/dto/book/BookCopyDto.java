package com.example.library.dto.book;

import com.example.library.entity.BookCopy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Book copy response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookCopyDto {
    private Integer id;
    private Integer bookId;
    private String bookTitle;
    private String isbn;
    private BookCopy.CopyStatus status;
    private LocalDate acquisitionDate;
    private BigDecimal price;
    private String notes;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    private String locationCode;
    private String rfidTag;
    private Integer floorPlanId;
}
