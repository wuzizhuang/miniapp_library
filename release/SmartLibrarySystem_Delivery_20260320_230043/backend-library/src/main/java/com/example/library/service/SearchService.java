package com.example.library.service;

import com.example.library.dto.SearchLogDto;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Service for discovery and search features.
 */
public interface SearchService {

    /**
     * Gets trending hot keywords.
     */
    List<String> getHotKeywords(int limit);

    /**
     * Gets search suggestions based on prefix.
     */
    List<String> getSearchSuggestions(String prefix, int limit);

    /**
     * Returns the paginated search history for a specific user.
     */
    Page<SearchLogDto> getUserSearchHistory(Integer userId, int page, int size);
}
