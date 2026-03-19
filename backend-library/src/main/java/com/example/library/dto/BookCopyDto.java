package com.example.library.dto;

import com.example.library.entity.BookCopy;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BookCopyDto {
    private Integer copyId;
    private Integer bookId;
    private String bookTitle;
    private String bookIsbn;
    private BookCopy.CopyStatus status;
    private LocalDate acquisitionDate;
    private BigDecimal price;
    private String notes;
}