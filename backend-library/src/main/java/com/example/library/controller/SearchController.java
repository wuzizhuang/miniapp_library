package com.example.library.controller;

import com.example.library.dto.SearchLogDto;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.SearchService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints for search discovery features.
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * Gets trending search keywords.
     */
    @GetMapping("/hot")
    public ResponseEntity<List<String>> getHotKeywords(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(searchService.getHotKeywords(limit));
    }

    /**
     * Gets search suggestions based on prefix.
     */
    @GetMapping("/suggestions")
    public ResponseEntity<List<String>> getSearchSuggestions(
            HttpServletRequest request,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit) {
        requestRateLimitService.checkSearchSuggestionLimit(request);
        return ResponseEntity.ok(searchService.getSearchSuggestions(keyword, limit));
    }

    /**
     * Returns the current user's paginated search history.
     */
    @GetMapping("/history")
    public ResponseEntity<Page<SearchLogDto>> getMySearchHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(searchService.getUserSearchHistory(authenticatedUser.getId(), page, size));
    }

    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
