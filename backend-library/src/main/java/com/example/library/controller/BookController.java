package com.example.library.controller;

import com.example.library.dto.ReviewResponseDto;
import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCreateDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.book.BookLocationMapDto;
import com.example.library.dto.book.BookUpdateDto;
import com.example.library.service.BookAuthorService;
import com.example.library.service.BookCopyService;
import com.example.library.service.BookLocationMapService;
import com.example.library.service.BookService;
import com.example.library.service.ReviewService;
import com.example.library.security.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Book catalog endpoints.
 */
@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;
    private final BookAuthorService bookAuthorService;
    private final BookCopyService bookCopyService;
    private final BookLocationMapService bookLocationMapService;
    private final ReviewService reviewService;

    /**
     * Returns paged book listings.
     */
    @GetMapping
    public ResponseEntity<Page<BookDetailDto>> getAllBooks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "title") String sortBy,
            @RequestParam(defaultValue = "ASC") String direction) {
        return ResponseEntity.ok(bookService.getAllBooks(page, size, sortBy, direction));
    }

    /**
     * Returns details for a single book.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookDetailDto> getBookById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    /**
     * Returns book details by ISBN.
     */
    @GetMapping("/isbn/{isbn}")
    public ResponseEntity<BookDetailDto> getBookByIsbn(@PathVariable String isbn) {
        return ResponseEntity.ok(bookService.getBookByIsbn(isbn));
    }

    /**
     * Searches books by keyword.
     */
    @GetMapping("/search")
    public ResponseEntity<Page<BookDetailDto>> searchBooks(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String publisher,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Boolean availableOnly,
            @RequestParam(defaultValue = "RELEVANCE") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Integer userId = (userDetails != null) ? userDetails.getId() : null;
        return ResponseEntity.ok(bookService.searchBooks(
                keyword,
                title,
                author,
                publisher,
                categoryId,
                availableOnly,
                sort,
                page,
                size,
                userId));
    }

    /**
     * Returns books within a category.
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<BookDetailDto>> getBooksByCategory(
            @PathVariable Integer categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookService.getBooksByCategory(categoryId, page, size));
    }

    /**
     * Returns books by a specific author.
     */
    @GetMapping("/author/{authorId}")
    public ResponseEntity<Page<BookDetailDto>> getBooksByAuthor(
            @PathVariable Integer authorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookService.getBooksByAuthor(authorId, page, size));
    }

    /**
     * Returns all copies for a given book.
     */
    @GetMapping("/{bookId}/copies")
    public ResponseEntity<List<BookCopyDto>> getBookCopiesByBookId(@PathVariable Integer bookId) {
        return ResponseEntity.ok(bookCopyService.getBookCopiesByBookId(bookId));
    }

    /**
     * Returns a generated default floor map for the book's physical copies.
     */
    @GetMapping("/{bookId}/location-map")
    public ResponseEntity<BookLocationMapDto> getBookLocationMap(@PathVariable Integer bookId) {
        return ResponseEntity.ok(bookLocationMapService.getBookLocationMap(bookId));
    }

    /**
     * Creates a new book (admin only).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:write')")
    public ResponseEntity<BookDetailDto> createBook(@Valid @RequestBody BookCreateDto bookCreateDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createBook(bookCreateDto));
    }

    /**
     * Links an author to a book (admin only).
     */
    @PostMapping("/{bookId}/authors/{authorId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:write')")
    public ResponseEntity<BookDetailDto> addAuthorToBook(
            @PathVariable Integer bookId,
            @PathVariable Integer authorId,
            @RequestParam(value = "authorOrder", defaultValue = "1") Integer authorOrder) {
        bookAuthorService.addAuthorToBook(authorId, bookId, authorOrder);
        return ResponseEntity.ok(bookAuthorService.getBookDetailDto(bookId));
    }

    /**
     * Removes an author from a book (admin only).
     */
    @DeleteMapping("/{bookId}/authors/{authorId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:write')")
    public ResponseEntity<BookDetailDto> removeAuthorFromBook(
            @PathVariable Integer bookId,
            @PathVariable Integer authorId) {
        bookAuthorService.removeAuthorFromBook(authorId, bookId);
        return ResponseEntity.ok(bookAuthorService.getBookDetailDto(bookId));
    }

    /**
     * Updates a book (admin only).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:write')")
    public ResponseEntity<BookDetailDto> updateBook(
            @PathVariable Integer id,
            @Valid @RequestBody BookUpdateDto bookUpdateDto) {
        return ResponseEntity.ok(bookService.updateBook(id, bookUpdateDto));
    }

    /**
     * Deletes a book (admin only).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:delete')")
    public ResponseEntity<Void> deleteBook(@PathVariable Integer id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns newly arrived books.
     */
    @GetMapping("/new-arrivals")
    public ResponseEntity<Page<BookDetailDto>> getNewArrivals(
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookService.getNewArrivals(size));
    }

    /**
     * Returns trending (most borrowed) books.
     */
    @GetMapping("/trending")
    public ResponseEntity<List<BookDetailDto>> getTrendingBooks(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(bookService.getTrendingBooks(limit));
    }

    /**
     * Returns approved reviews for a book.
     */
    @GetMapping("/{bookId}/reviews")
    public ResponseEntity<Page<ReviewResponseDto>> getBookReviews(
            @PathVariable Integer bookId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createTime") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction) {
        Sort.Direction sortDir = direction.equalsIgnoreCase("DESC") ? Sort.Direction.DESC : Sort.Direction.ASC;
        return ResponseEntity.ok(
                reviewService.getReviewsByBookId(bookId, PageRequest.of(page, size, Sort.by(sortDir, sortBy))));
    }
}
