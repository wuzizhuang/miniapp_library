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
 * 图书目录控制器。
 * 提供图书查询、搜索、详情、馆藏副本和图书维护等接口。
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
     * 分页查询图书列表。
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
     * 根据图书 ID 获取详情。
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookDetailDto> getBookById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    /**
     * 根据 ISBN 获取图书详情。
     */
    @GetMapping("/isbn/{isbn}")
    public ResponseEntity<BookDetailDto> getBookByIsbn(@PathVariable String isbn) {
        return ResponseEntity.ok(bookService.getBookByIsbn(isbn));
    }

    /**
     * 按关键字和多维条件搜索图书。
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
     * 查询某个分类下的图书。
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<BookDetailDto>> getBooksByCategory(
            @PathVariable Integer categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookService.getBooksByCategory(categoryId, page, size));
    }

    /**
     * 查询某位作者名下的图书。
     */
    @GetMapping("/author/{authorId}")
    public ResponseEntity<Page<BookDetailDto>> getBooksByAuthor(
            @PathVariable Integer authorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookService.getBooksByAuthor(authorId, page, size));
    }

    /**
     * 查询某本图书的全部馆藏副本。
     */
    @GetMapping("/{bookId}/copies")
    public ResponseEntity<List<BookCopyDto>> getBookCopiesByBookId(@PathVariable Integer bookId) {
        return ResponseEntity.ok(bookCopyService.getBookCopiesByBookId(bookId));
    }

    /**
     * 获取图书馆藏位置示意图。
     */
    @GetMapping("/{bookId}/location-map")
    public ResponseEntity<BookLocationMapDto> getBookLocationMap(@PathVariable Integer bookId) {
        return ResponseEntity.ok(bookLocationMapService.getBookLocationMap(bookId));
    }

    /**
     * 新增图书。
     * 仅管理员或具备图书写权限的账号可调用。
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:write')")
    public ResponseEntity<BookDetailDto> createBook(@Valid @RequestBody BookCreateDto bookCreateDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createBook(bookCreateDto));
    }

    /**
     * 为图书绑定作者及其展示顺序。
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
     * 移除图书与作者之间的关联。
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
     * 更新图书信息。
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:write')")
    public ResponseEntity<BookDetailDto> updateBook(
            @PathVariable Integer id,
            @Valid @RequestBody BookUpdateDto bookUpdateDto) {
        return ResponseEntity.ok(bookService.updateBook(id, bookUpdateDto));
    }

    /**
     * 删除图书。
     * 当前实现为业务层软删除，而不是直接物理删除记录。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('book:delete')")
    public ResponseEntity<Void> deleteBook(@PathVariable Integer id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 获取新到馆图书。
     */
    @GetMapping("/new-arrivals")
    public ResponseEntity<Page<BookDetailDto>> getNewArrivals(
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookService.getNewArrivals(size));
    }

    /**
     * 获取热门图书。
     */
    @GetMapping("/trending")
    public ResponseEntity<List<BookDetailDto>> getTrendingBooks(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(bookService.getTrendingBooks(limit));
    }

    /**
     * 获取某本图书的已审核评论。
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
