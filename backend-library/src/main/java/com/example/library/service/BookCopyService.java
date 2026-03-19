package com.example.library.service;

import com.example.library.dto.book.BookCopyCreateDto;
import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCopyUpdateDto;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Book copy inventory service.
 */
public interface BookCopyService {
    /**
     * Creates a book copy.
     */
    BookCopyDto createBookCopy(BookCopyCreateDto bookCopyCreateDto);

    /**
     * Returns a book copy by id.
     */
    BookCopyDto getBookCopyById(Integer id);

    /**
     * Updates a book copy.
     */
    BookCopyDto updateBookCopy(Integer id, BookCopyUpdateDto bookCopyUpdateDto);

    /**
     * Deletes a book copy.
     */
    void deleteBookCopy(Integer id);

    /**
     * Returns all copies for a book.
     */
    List<BookCopyDto> getBookCopiesByBookId(Integer bookId);

    /**
     * Returns paged book copies.
     */
    Page<BookCopyDto> getAllBookCopies(int page, int size, String sortBy, String direction, Integer bookId, String status,
            String keyword);

    /**
     * Returns available copies for a book.
     */
    List<BookCopyDto> getAvailableCopiesByBookId(Integer bookId);
}
