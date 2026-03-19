package com.example.library.controller;

import com.example.library.dto.book.BookDetailDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints for managing user favorites.
 */
@RestController
@RequestMapping("/api/user-favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    /**
     * Gets user's favorite books.
     */
    @GetMapping
    public ResponseEntity<Page<BookDetailDto>> getMyFavorites(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(favoriteService.getUserFavorites(userDetails.getId().longValue(), page, size));
    }

    /**
     * Adds a book to favorites.
     */
    @PostMapping("/{bookId}")
    public ResponseEntity<Void> addFavorite(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer bookId) {
        favoriteService.addFavorite(userDetails.getId().longValue(), bookId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Removes a book from favorites.
     */
    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> removeFavorite(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer bookId) {
        favoriteService.removeFavorite(userDetails.getId().longValue(), bookId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{bookId}/check")
    public ResponseEntity<Boolean> checkFavorite(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer bookId) {
        return ResponseEntity.ok(favoriteService.isFavorite(userDetails.getId().longValue(), bookId));
    }
}
