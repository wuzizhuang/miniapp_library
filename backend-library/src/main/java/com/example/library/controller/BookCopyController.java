package com.example.library.controller;

import com.example.library.dto.book.BookCopyCreateDto;
import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCopyUpdateDto;
import com.example.library.service.BookCopyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Book copy inventory endpoints.
 */
@RestController
@RequestMapping("/api/book-copies")
@RequiredArgsConstructor
public class BookCopyController {

    private final BookCopyService bookCopyService;

    /**
     * Creates a new book copy (admin only).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookCopyDto> createBookCopy(
            @Valid @RequestBody BookCopyCreateDto bookCopyCreateDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookCopyService.createBookCopy(bookCopyCreateDto));
    }

    /**
     * Returns a book copy by id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookCopyDto> getBookCopyById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookCopyService.getBookCopyById(id));
    }

    /**
     * Updates a book copy (admin only).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookCopyDto> updateBookCopy(
            @PathVariable Integer id,
            @Valid @RequestBody BookCopyUpdateDto bookCopyUpdateDto) {
        return ResponseEntity.ok(bookCopyService.updateBookCopy(id, bookCopyUpdateDto));
    }

    /**
     * Deletes a book copy (admin only).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBookCopy(@PathVariable Integer id) {
        bookCopyService.deleteBookCopy(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns paged book copies (admin only).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<BookCopyDto>> getAllBookCopies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") String direction,
            @RequestParam(required = false) Integer bookId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(bookCopyService.getAllBookCopies(page, size, sortBy, direction, bookId, status, keyword));
    }
}
