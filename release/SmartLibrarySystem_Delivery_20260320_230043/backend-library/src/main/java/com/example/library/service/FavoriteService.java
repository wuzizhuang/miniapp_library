package com.example.library.service;

import com.example.library.dto.book.BookDetailDto;
import org.springframework.data.domain.Page;

/**
 * Service for managing user favorites.
 */
public interface FavoriteService {

    /**
     * Adds a book to user's favorites.
     */
    void addFavorite(Long userId, Integer bookId);

    /**
     * Removes a book from user's favorites.
     */
    void removeFavorite(Long userId, Integer bookId);

    /**
     * Gets a paginated list of a user's favorite books.
     */
    Page<BookDetailDto> getUserFavorites(Long userId, int page, int size);

    /**
     * Checks if a user has favorited a specific book.
     */
    boolean isFavorite(Long userId, Integer bookId);
}
