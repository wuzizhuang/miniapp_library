package com.example.library.service;

import com.example.library.dto.book.BookDetailDto;

/**
 * Service for book-author relationships.
 */
public interface BookAuthorService {

    /**
     * Links an author to a book with ordering.
     */
    void addAuthorToBook(Integer authorId, Integer bookId, Integer authorOrder);

    /**
     * Returns book details with author list.
     */
    BookDetailDto getBookDetailDto(Integer bookId);

    /**
     * Removes an author link from a book.
     */
    void removeAuthorFromBook(Integer authorId, Integer bookId);
}
