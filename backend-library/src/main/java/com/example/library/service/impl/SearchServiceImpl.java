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

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final SearchHistoryRepository searchHistoryRepository;

    @Override
    @Cacheable(cacheNames = "searchHotKeywords", key = "#limit")
    @Transactional(readOnly = true)
    public List<String> getHotKeywords(int limit) {
        return searchHistoryRepository.findTopKeywords(PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getSearchSuggestions(String prefix, int limit) {
        if (prefix == null || prefix.isBlank()) {
            return List.of();
        }
        return searchHistoryRepository.findSuggestions(prefix, PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SearchLogDto> getUserSearchHistory(Integer userId, int page, int size) {
        return searchHistoryRepository
                .findByUserIdOrderBySearchTimeDesc(userId, PageRequest.of(page, size))
                .map(this::convertToDto);
    }

    private SearchLogDto convertToDto(SearchHistory history) {
        SearchLogDto dto = new SearchLogDto();
        dto.setSearchId(history.getSearchId());
        dto.setKeyword(history.getKeyword());
        dto.setResultCount(history.getResultCount());
        dto.setSearchTime(history.getSearchTime());
        return dto;
    }
}
