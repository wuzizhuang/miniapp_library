package com.example.library.service.impl;

import com.example.library.dto.SearchLogDto;
import com.example.library.entity.SearchHistory;
import com.example.library.repository.SearchHistoryRepository;
import com.example.library.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 搜索服务实现类。
 * 负责热搜词、搜索建议以及用户搜索历史查询。
 */
@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final SearchHistoryRepository searchHistoryRepository;

    /**
     * 获取热搜关键词列表。
     * 结果会按 limit 维度缓存。
     */
    @Override
    @Cacheable(cacheNames = "searchHotKeywords", key = "#limit")
    @Transactional(readOnly = true)
    public List<String> getHotKeywords(int limit) {
        return searchHistoryRepository.findTopKeywords(PageRequest.of(0, limit));
    }

    /**
     * 根据前缀获取搜索建议。
     */
    @Override
    @Transactional(readOnly = true)
    public List<String> getSearchSuggestions(String prefix, int limit) {
        if (prefix == null || prefix.isBlank()) {
            return List.of();
        }
        return searchHistoryRepository.findSuggestions(prefix, PageRequest.of(0, limit));
    }

    /**
     * 分页查询用户搜索历史。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<SearchLogDto> getUserSearchHistory(Integer userId, int page, int size) {
        return searchHistoryRepository
                .findByUserIdOrderBySearchTimeDesc(userId, PageRequest.of(page, size))
                .map(this::convertToDto);
    }

    /**
     * 将搜索历史实体转换为 DTO。
     */
    private SearchLogDto convertToDto(SearchHistory history) {
        SearchLogDto dto = new SearchLogDto();
        dto.setSearchId(history.getSearchId());
        dto.setKeyword(history.getKeyword());
        dto.setResultCount(history.getResultCount());
        dto.setSearchTime(history.getSearchTime());
        return dto;
    }
}
