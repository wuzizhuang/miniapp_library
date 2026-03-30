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
 * 搜索发现控制器。
 * 提供热搜词、搜索建议和用户搜索历史接口。
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * 获取热门搜索关键词。
     */
    @GetMapping("/hot")
    public ResponseEntity<List<String>> getHotKeywords(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(searchService.getHotKeywords(limit));
    }

    /**
     * 根据前缀获取搜索建议。
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
     * 分页查询当前用户的搜索历史。
     */
    @GetMapping("/history")
    public ResponseEntity<Page<SearchLogDto>> getMySearchHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(searchService.getUserSearchHistory(authenticatedUser.getId(), page, size));
    }

    /**
     * 要求当前请求必须处于已登录状态。
     */
    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
