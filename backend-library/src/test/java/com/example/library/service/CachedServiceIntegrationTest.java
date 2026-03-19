package com.example.library.service;

import com.example.library.config.CacheConfig;
import com.example.library.dto.DashboardAnalyticsDto;
import com.example.library.dto.DashboardStatsDto;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.FineRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.ReservationRepository;
import com.example.library.repository.SearchHistoryRepository;
import com.example.library.repository.UserBehaviorLogRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.SearchServiceImpl;
import com.example.library.service.impl.StatisticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(CachedServiceIntegrationTest.Config.class)
@DisplayName("Cacheable service 集成测试")
@SuppressWarnings("unchecked")
class CachedServiceIntegrationTest {

    @Configuration
    @EnableCaching
    static class Config {

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(
                    CacheConfig.SEARCH_HOT_KEYWORDS_CACHE,
                    CacheConfig.DASHBOARD_STATS_CACHE,
                    CacheConfig.DASHBOARD_ANALYTICS_CACHE);
        }

        @Bean
        SearchHistoryRepository searchHistoryRepository() {
            return mock(SearchHistoryRepository.class);
        }

        @Bean
        UserRepository userRepository() {
            return mock(UserRepository.class);
        }

        @Bean
        LoanRepository loanRepository() {
            return mock(LoanRepository.class);
        }

        @Bean
        BookCopyRepository bookCopyRepository() {
            return mock(BookCopyRepository.class);
        }

        @Bean
        ReservationRepository reservationRepository() {
            return mock(ReservationRepository.class);
        }

        @Bean
        FineRepository fineRepository() {
            return mock(FineRepository.class);
        }

        @Bean
        UserBehaviorLogRepository userBehaviorLogRepository() {
            return mock(UserBehaviorLogRepository.class);
        }

        @Bean
        SearchService searchService(SearchHistoryRepository searchHistoryRepository) {
            return new SearchServiceImpl(searchHistoryRepository);
        }

        @Bean
        StatisticsService statisticsService(
                UserRepository userRepository,
                LoanRepository loanRepository,
                BookCopyRepository bookCopyRepository,
                ReservationRepository reservationRepository,
                FineRepository fineRepository,
                SearchHistoryRepository searchHistoryRepository,
                UserBehaviorLogRepository userBehaviorLogRepository) {
            return new StatisticsServiceImpl(
                    userRepository,
                    loanRepository,
                    bookCopyRepository,
                    reservationRepository,
                    fineRepository,
                    searchHistoryRepository,
                    userBehaviorLogRepository);
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    private CacheManager cacheManager;

    @org.springframework.beans.factory.annotation.Autowired
    private SearchService searchService;

    @org.springframework.beans.factory.annotation.Autowired
    private StatisticsService statisticsService;

    @org.springframework.beans.factory.annotation.Autowired
    private SearchHistoryRepository searchHistoryRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private LoanRepository loanRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private BookCopyRepository bookCopyRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private ReservationRepository reservationRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private FineRepository fineRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private UserBehaviorLogRepository userBehaviorLogRepository;

    @BeforeEach
    void setUp() {
        reset(
                searchHistoryRepository,
                userRepository,
                loanRepository,
                bookCopyRepository,
                reservationRepository,
                fineRepository,
                userBehaviorLogRepository);

        cacheManager.getCacheNames().forEach(cacheName -> {
            if (cacheManager.getCache(cacheName) != null) {
                cacheManager.getCache(cacheName).clear();
            }
        });
    }

    @Test
    @DisplayName("hot keywords 按 limit 维度缓存")
    void hotKeywordsAreCachedPerLimit() {
        when(searchHistoryRepository.findTopKeywords(any(Pageable.class)))
                .thenAnswer(invocation -> {
                    Pageable pageable = invocation.getArgument(0);
                    return List.of("limit-" + pageable.getPageSize());
                });

        assertThat(searchService.getHotKeywords(10)).containsExactly("limit-10");
        assertThat(searchService.getHotKeywords(10)).containsExactly("limit-10");
        assertThat(searchService.getHotKeywords(5)).containsExactly("limit-5");

        verify(searchHistoryRepository, times(1)).findTopKeywords(PageRequest.of(0, 10));
        verify(searchHistoryRepository, times(1)).findTopKeywords(PageRequest.of(0, 5));
    }

    @Test
    @DisplayName("dashboard stats 在同一窗口内只聚合一次")
    void dashboardStatsAreCached() {
        stubCoreStatistics();

        DashboardStatsDto first = statisticsService.getCoreDashboardStatistics();
        DashboardStatsDto second = statisticsService.getCoreDashboardStatistics();

        assertThat(first.getTotalUsers()).isEqualTo(18L);
        assertThat(second.getTotalPendingFines()).isEqualByComparingTo("15.50");
        verify(userRepository, times(1)).count();
        verify(loanRepository, times(1)).countAllActiveAndOverdueLoans();
        verify(fineRepository, times(1)).sumTotalPendingFines();
    }

    @Test
    @DisplayName("dashboard analytics 在同一窗口内只聚合一次")
    void dashboardAnalyticsAreCached() {
        stubCoreStatistics();
        when(loanRepository.countBorrowedByDateSince(any(LocalDate.class))).thenReturn(List.of());
        when(loanRepository.countReturnedByDateSince(any(LocalDate.class))).thenReturn(List.of());
        when(reservationRepository.countGroupedByStatus()).thenReturn(List.of());
        when(fineRepository.countGroupedByStatus()).thenReturn(List.of());
        when(searchHistoryRepository.findTopKeywordsWithCount(any(Pageable.class)))
                .thenReturn(List.<Object[]>of(new Object[] { "redis", 4L }));
        when(userBehaviorLogRepository.countGroupedByActionType()).thenReturn(List.of());
        when(loanRepository.findAllByOrderByBorrowDateDescLoanIdDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardAnalyticsDto first = statisticsService.getDashboardAnalytics();
        DashboardAnalyticsDto second = statisticsService.getDashboardAnalytics();

        assertThat(first.getTopKeywords()).hasSize(1);
        assertThat(second.getTopKeywords().get(0).getKey()).isEqualTo("redis");
        verify(userRepository, times(1)).count();
        verify(searchHistoryRepository, times(1)).findTopKeywordsWithCount(PageRequest.of(0, 8));
        verify(loanRepository, times(1)).findAllByOrderByBorrowDateDescLoanIdDesc(PageRequest.of(0, 8));
    }

    private void stubCoreStatistics() {
        when(userRepository.count()).thenReturn(18L);
        when(loanRepository.countAllActiveAndOverdueLoans()).thenReturn(6L);
        when(loanRepository.countActualOverdueLoans()).thenReturn(2L);
        when(bookCopyRepository.countTotalAvailableCopies()).thenReturn(21L);
        when(reservationRepository.countTotalPendingReservations()).thenReturn(3L);
        when(fineRepository.sumTotalPendingFines()).thenReturn(BigDecimal.valueOf(15.50));
    }
}
