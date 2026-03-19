package com.example.library.service;

import com.example.library.dto.book.BookLocationMapDto;

/**
 * Generates a default floor map for locating a book's physical copies.
 */
public interface BookLocationMapService {
    BookLocationMapDto getBookLocationMap(Integer bookId);
}
