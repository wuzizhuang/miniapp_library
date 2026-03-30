package com.example.library.dto.book;

import com.example.library.entity.Book;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Book update request DTO.
 */
@Data
public class BookUpdateDto {
    @Pattern(regexp = "^[0-9-]{10,20}$", message = "ISBN must be valid format")
    private String isbn;

    @Size(max = 255, message = "Title must be less than 255 characters")
    private String title;

    private String coverUrl;
    private Book.ResourceMode resourceMode;
    private String onlineAccessUrl;
    private Book.OnlineAccessType onlineAccessType;
    private String description;
    private Integer pageCount;
    private Integer publishedYear;

    @Size(max = 50, message = "Language must be less than 50 characters")
    private String language;

    private Integer publisherId;
    private Integer categoryId;
    private List<Integer> authorIds;
}
