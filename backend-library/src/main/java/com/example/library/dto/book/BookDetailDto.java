package com.example.library.dto.book;

import com.example.library.dto.AuthorDto;
import com.example.library.entity.Book;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Book detail response DTO.
 */
@Data
public class BookDetailDto {
    private Integer bookId;
    private String isbn;
    private String title;
    private String coverUrl;
    private Book.ResourceMode resourceMode;
    private String onlineAccessUrl;
    private Book.OnlineAccessType onlineAccessType;
    private String description;
    private Integer pageCount;
    private Integer publishedYear;
    private String language;
    private Integer publisherId;
    private String publisherName;
    private Integer categoryId;
    private String categoryName;
    private List<AuthorDto> authors = new ArrayList<>();
    private Integer availableCopies;
    private Integer totalCopies;
    private Integer pendingReservationCount;

    private Double avgRating;
    private Integer reviewCount;
}
