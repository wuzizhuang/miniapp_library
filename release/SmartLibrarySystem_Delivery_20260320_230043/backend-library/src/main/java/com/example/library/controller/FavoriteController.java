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
 * 收藏控制器。
 * 提供用户收藏列表、添加收藏、取消收藏和收藏状态查询接口。
 */
@RestController
@RequestMapping("/api/user-favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    /**
     * 查询当前用户收藏的图书。
     */
    @GetMapping
    public ResponseEntity<Page<BookDetailDto>> getMyFavorites(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(favoriteService.getUserFavorites(userDetails.getId().longValue(), page, size));
    }

    /**
     * 添加图书到收藏夹。
     */
    @PostMapping("/{bookId}")
    public ResponseEntity<Void> addFavorite(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer bookId) {
        favoriteService.addFavorite(userDetails.getId().longValue(), bookId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * 从收藏夹移除图书。
     */
    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> removeFavorite(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer bookId) {
        favoriteService.removeFavorite(userDetails.getId().longValue(), bookId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 检查某本书是否已被当前用户收藏。
     */
    @GetMapping("/{bookId}/check")
    public ResponseEntity<Boolean> checkFavorite(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer bookId) {
        return ResponseEntity.ok(favoriteService.isFavorite(userDetails.getId().longValue(), bookId));
    }
}
