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
 * 图书副本库存控制器。
 * 负责副本的增删改查以及后台分页筛选。
 */
@RestController
@RequestMapping("/api/book-copies")
@RequiredArgsConstructor
public class BookCopyController {

    private final BookCopyService bookCopyService;

    /**
     * 新增图书副本，仅管理员可操作。
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookCopyDto> createBookCopy(
            @Valid @RequestBody BookCopyCreateDto bookCopyCreateDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookCopyService.createBookCopy(bookCopyCreateDto));
    }

    /**
     * 按主键查询单个副本详情。
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookCopyDto> getBookCopyById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookCopyService.getBookCopyById(id));
    }

    /**
     * 更新副本信息，仅管理员可操作。
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookCopyDto> updateBookCopy(
            @PathVariable Integer id,
            @Valid @RequestBody BookCopyUpdateDto bookCopyUpdateDto) {
        return ResponseEntity.ok(bookCopyService.updateBookCopy(id, bookCopyUpdateDto));
    }

    /**
     * 删除副本，仅管理员可操作。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBookCopy(@PathVariable Integer id) {
        bookCopyService.deleteBookCopy(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 分页查询副本列表，支持按图书、状态和关键字筛选。
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
