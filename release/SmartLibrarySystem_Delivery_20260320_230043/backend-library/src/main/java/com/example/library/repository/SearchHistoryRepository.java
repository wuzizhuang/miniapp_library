package com.example.library.repository;

import com.example.library.entity.SearchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Repository for search history entries.
 */
@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {

    @Query("SELECT s.keyword FROM SearchHistory s GROUP BY s.keyword ORDER BY COUNT(s) DESC")
    List<String> findTopKeywords(Pageable pageable);

    @Query("""
            SELECT s.keyword, COUNT(s)
            FROM SearchHistory s
            GROUP BY s.keyword
            ORDER BY COUNT(s) DESC, s.keyword ASC
            """)
    List<Object[]> findTopKeywordsWithCount(Pageable pageable);

    @Query("SELECT DISTINCT s.keyword FROM SearchHistory s WHERE LOWER(s.keyword) LIKE LOWER(CONCAT(:prefix, '%')) ORDER BY s.keyword ASC")
    List<String> findSuggestions(@Param("prefix") String prefix, Pageable pageable);

    Page<SearchHistory> findByUserIdOrderBySearchTimeDesc(Integer userId, Pageable pageable);
}
