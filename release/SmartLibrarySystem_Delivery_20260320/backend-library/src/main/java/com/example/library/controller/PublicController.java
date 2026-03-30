package com.example.library.controller;

import com.example.library.dto.AuthorDto;
import com.example.library.dto.DashboardStatsDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.publicapi.HomePageDto;
import com.example.library.dto.publicapi.PublicAiChatRequestDto;
import com.example.library.dto.publicapi.PublicAiChatResponseDto;
import com.example.library.entity.Book;
import com.example.library.repository.BookRepository;
import com.example.library.security.RequestRateLimitService;
import com.example.library.service.AiChatService;
import com.example.library.service.BookService;
import com.example.library.service.StatisticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Public endpoints that do not require authentication.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final BookService bookService;
    private final StatisticsService statisticsService;
    private final BookRepository bookRepository;
    private final AiChatService aiChatService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * Returns a basic health check payload.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Library Management System is running");
        return ResponseEntity.ok(response);
    }

    /**
     * Returns homepage aggregated data.
     */
    @GetMapping("/home")
    public ResponseEntity<HomePageDto> getHomePageData(
            @RequestParam(defaultValue = "4") int featuredLimit,
            @RequestParam(defaultValue = "4") int newArrivalLimit,
            @RequestParam(defaultValue = "4") int categoryLimit) {

        int safeFeaturedLimit = Math.max(1, Math.min(featuredLimit, 12));
        int safeNewArrivalLimit = Math.max(1, Math.min(newArrivalLimit, 12));
        int safeCategoryLimit = Math.max(1, Math.min(categoryLimit, 12));

        DashboardStatsDto stats = statisticsService.getCoreDashboardStatistics();
        long totalBooks = bookRepository.countByStatus(Book.BookStatus.ACTIVE);

        List<BookDetailDto> featured = new ArrayList<>(bookService.getTrendingBooks(safeFeaturedLimit));
        if (featured.isEmpty()) {
            featured = bookService.getNewArrivals(safeFeaturedLimit).getContent();
        }

        List<BookDetailDto> arrivals = bookService.getNewArrivals(safeNewArrivalLimit).getContent();

        HomePageDto response = new HomePageDto();
        response.setHeroStats(buildHeroStats(stats, totalBooks));
        response.setFeaturedBooks(featured.stream()
                .map(book -> toBookItem(book, "热门"))
                .toList());
        response.setNewArrivals(arrivals.stream()
                .map(book -> toBookItem(book, "新上架"))
                .toList());
        response.setCategories(bookRepository.countBooksByCategory(Book.BookStatus.ACTIVE).stream()
                .limit(safeCategoryLimit)
                .map(this::toCategoryItem)
                .toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Public homepage AI chat proxy.
     */
    @PostMapping(path = "/ai/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<PublicAiChatResponseDto> chatWithAi(
            @Valid @RequestBody PublicAiChatRequestDto requestDto,
            HttpServletRequest request) {
        requestRateLimitService.checkPublicAiChatLimit(request);
        return ResponseEntity.status(HttpStatus.OK)
                .body(aiChatService.chat(requestDto.getMessages()));
    }

    private List<HomePageDto.StatItem> buildHeroStats(DashboardStatsDto stats, long totalBooks) {
        HomePageDto.StatItem books = new HomePageDto.StatItem();
        books.setLabel("馆藏图书");
        books.setValue(totalBooks);

        HomePageDto.StatItem readers = new HomePageDto.StatItem();
        readers.setLabel("注册读者");
        readers.setValue(safeLong(stats.getTotalUsers()));

        HomePageDto.StatItem activeLoans = new HomePageDto.StatItem();
        activeLoans.setLabel("在借册数");
        activeLoans.setValue(safeLong(stats.getActiveLoans()));

        HomePageDto.StatItem availableCopies = new HomePageDto.StatItem();
        availableCopies.setLabel("可借副本");
        availableCopies.setValue(safeLong(stats.getAvailableCopies()));

        return List.of(books, readers, activeLoans, availableCopies);
    }

    private HomePageDto.BookItem toBookItem(BookDetailDto book, String tag) {
        HomePageDto.BookItem item = new HomePageDto.BookItem();
        item.setId(book.getBookId());
        item.setTitle(book.getTitle());
        item.setAuthor(extractAuthorNames(book));
        item.setCover(book.getCoverUrl());
        item.setTag(tag);
        return item;
    }

    private HomePageDto.CategoryItem toCategoryItem(BookRepository.CategoryBookCountView view) {
        HomePageDto.CategoryItem item = new HomePageDto.CategoryItem();
        item.setCategoryId(view.getCategoryId());
        item.setLabel(view.getCategoryName());
        item.setCount(safeLong(view.getBookCount()));
        return item;
    }

    private String extractAuthorNames(BookDetailDto book) {
        if (book.getAuthors() == null || book.getAuthors().isEmpty()) {
            return "Unknown Author";
        }

        String names = book.getAuthors().stream()
                .map(AuthorDto::getName)
                .filter(Objects::nonNull)
                .filter(name -> !name.isBlank())
                .collect(Collectors.joining(", "));

        return names.isBlank() ? "Unknown Author" : names;
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }
}
