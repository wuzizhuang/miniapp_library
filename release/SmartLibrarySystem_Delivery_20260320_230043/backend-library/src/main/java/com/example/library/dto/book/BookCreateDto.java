package com.example.library.dto.book;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.example.library.entity.Book;

import java.util.ArrayList;
import java.util.List;

/**
 * Book creation request DTO.
 */
@Data
public class BookCreateDto {
    @NotBlank(message = "ISBN is required")
    @Pattern(regexp = "^[0-9-]{10,20}$", message = "ISBN must be valid format")
    private String isbn;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be less than 255 characters")
    private String title;

    private String coverUrl;
    private Book.ResourceMode resourceMode;
    private String onlineAccessUrl;
    private Book.OnlineAccessType onlineAccessType;
    private String description;
    private Integer pageCount;

    @NotNull(message = "Published year is required")
    private Integer publishedYear;

    @NotBlank(message = "Language is required")
    @Size(max = 50, message = "Language must be less than 50 characters")
    private String language;

    private Integer publisherId;
    private Integer categoryId;
    private List<Integer> authorIds = new ArrayList<>();

    @NotNull(message = "Copy count is required")
    private Integer copyCount;

}
