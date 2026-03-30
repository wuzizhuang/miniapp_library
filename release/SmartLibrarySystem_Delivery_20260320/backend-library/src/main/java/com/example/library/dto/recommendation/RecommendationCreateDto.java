package com.example.library.dto.recommendation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RecommendationCreateDto {

    @NotNull(message = "bookId is required")
    private Integer bookId;

    @NotBlank(message = "content cannot be blank")
    @Size(max = 2000, message = "content length cannot exceed 2000")
    private String content;
}
