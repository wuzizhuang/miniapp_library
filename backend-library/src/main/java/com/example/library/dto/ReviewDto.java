package com.example.library.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Review request DTO.
 */
@Data
public class ReviewDto {
    @NotNull
    private Long bookId;

    private Long loanId;

    @Min(1) @Max(5)
    private Integer rating;

    @Size(max = 500)
    private String commentText;
}
