package com.example.library.service;

import com.example.library.dto.book.BookCreateDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.book.BookUpdateDto;
import org.springframework.data.domain.Page;
import java.util.List;

/**
 * Book catalog service.
 */
public interface BookService {
    /**
     * Returns paged book details.
     */
    Page<BookDetailDto> getAllBooks(int page, int size, String sortBy, String direction);

    /**
     * Returns book details by id.
     */
    BookDetailDto getBookById(Integer id);

    /**
     * Returns book details by ISBN.
     */
    BookDetailDto getBookByIsbn(String isbn);

    /**
     * Searches books by keyword.
     */
    Page<BookDetailDto> searchBooks(
            String keyword,
            String title,
            String author,
            String publisher,
            Integer categoryId,
            Boolean availableOnly,
            String sort,
            int page,
            int size,
            Integer userId);

    /**
     * Returns books by category.
     */
    Page<BookDetailDto> getBooksByCategory(Integer categoryId, int page, int size);

    /**
     * Returns books by author.
     */
    Page<BookDetailDto> getBooksByAuthor(Integer authorId, int page, int size);

    /**
     * Returns books by publisher.
     */
    Page<BookDetailDto> getBooksByPublisher(Integer publisherId, int page, int size);

    /**
     * Creates a new book and related copies.
     */
    BookDetailDto createBook(BookCreateDto bookCreateDto);

    /**
     * Updates a book and its author relationships.
     */
    BookDetailDto updateBook(Integer id, BookUpdateDto bookUpdateDto);

    /**
     * Deletes a book.
     */
    void deleteBook(Integer id);

    /**
     * Returns newly arrived books within a limit.
     */
    Page<BookDetailDto> getNewArrivals(int limit);

    /**
     * Returns trending (most borrowed) books within a limit.
     */
    List<BookDetailDto> getTrendingBooks(int limit);
}
