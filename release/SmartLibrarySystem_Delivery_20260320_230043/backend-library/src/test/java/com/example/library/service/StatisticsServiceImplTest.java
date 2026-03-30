package com.example.library.service;

import com.example.library.dto.DashboardAnalyticsDto;
import com.example.library.dto.DashboardStatsDto;
import com.example.library.entity.Loan;
import com.example.library.entity.UserBehaviorLog;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.FineRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.ReservationRepository;
import com.example.library.repository.SearchHistoryRepository;
import com.example.library.repository.UserBehaviorLogRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.StatisticsServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StatisticsService 单元测试")
class StatisticsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private BookCopyRepository bookCopyRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private FineRepository fineRepository;

    @Mock
    private SearchHistoryRepository searchHistoryRepository;

    @Mock
    private UserBehaviorLogRepository userBehaviorLogRepository;

    @InjectMocks
    private StatisticsServiceImpl statisticsService;

    @Test
    @DisplayName("getCoreDashboardStatistics — 成功返回核心统计")
    void getCoreDashboardStatistics_success() {
        when(userRepository.count()).thenReturn(20L);
        when(loanRepository.countAllActiveAndOverdueLoans()).thenReturn(6L);
        when(loanRepository.countActualOverdueLoans()).thenReturn(2L);
        when(bookCopyRepository.countTotalAvailableCopies()).thenReturn(40L);
        when(reservationRepository.countTotalPendingReservations()).thenReturn(3L);
        when(fineRepository.sumTotalPendingFines()).thenReturn(BigDecimal.valueOf(22.80));

        DashboardStatsDto result = statisticsService.getCoreDashboardStatistics();

        assertThat(result.getTotalUsers()).isEqualTo(20L);
        assertThat(result.getActiveLoans()).isEqualTo(6L);
        assertThat(result.getOverdueLoans()).isEqualTo(2L);
        assertThat(result.getAvailableCopies()).isEqualTo(40L);
        assertThat(result.getPendingReservations()).isEqualTo(3L);
        assertThat(result.getTotalPendingFines()).isEqualByComparingTo("22.80");
    }

    @Test
    @DisplayName("getDashboardAnalytics — 成功包含热词和行为统计")
    void getDashboardAnalytics_success() {
        Loan recentLoan = TestDataFactory.createActiveLoan(
                5,
                TestDataFactory.createUser(1, "reader"),
                TestDataFactory.createAvailableCopy(
                        7,
                        TestDataFactory.createBook(9, "Refactoring", "9780201485677")));
        recentLoan.setBorrowDate(LocalDate.now());
        recentLoan.setDueDate(LocalDate.now().plusDays(14));

        when(userRepository.count()).thenReturn(12L);
        when(loanRepository.countAllActiveAndOverdueLoans()).thenReturn(4L);
        when(loanRepository.countActualOverdueLoans()).thenReturn(1L);
        when(bookCopyRepository.countTotalAvailableCopies()).thenReturn(18L);
        when(reservationRepository.countTotalPendingReservations()).thenReturn(2L);
        when(fineRepository.sumTotalPendingFines()).thenReturn(BigDecimal.valueOf(9.90));
        when(loanRepository.countBorrowedByDateSince(any(LocalDate.class)))
                .thenReturn(List.<Object[]>of(new Object[] { LocalDate.now().minusDays(1), 2L }));
        when(loanRepository.countReturnedByDateSince(any(LocalDate.class)))
                .thenReturn(List.<Object[]>of(new Object[] { LocalDate.now().minusDays(1), 1L }));
        when(reservationRepository.countGroupedByStatus())
                .thenReturn(List.<Object[]>of(new Object[] { "PENDING", 2L }));
        when(fineRepository.countGroupedByStatus())
                .thenReturn(List.<Object[]>of(new Object[] { "PENDING", 1L }));
        when(searchHistoryRepository.findTopKeywordsWithCount(any(Pageable.class)))
                .thenReturn(List.<Object[]>of(
                        new Object[] { "spring boot", 5L },
                        new Object[] { "design patterns", 3L }));
        when(userBehaviorLogRepository.countGroupedByActionType())
                .thenReturn(List.<Object[]>of(
                        new Object[] { "VIEW_DETAIL", 8L },
                        new Object[] { "BORROW_BOOK", 2L }));
        when(loanRepository.findAllByOrderByBorrowDateDescLoanIdDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(recentLoan)));

        DashboardAnalyticsDto result = statisticsService.getDashboardAnalytics();

        assertThat(result.getSummary().getTotalUsers()).isEqualTo(12L);
        assertThat(result.getTopKeywords()).hasSize(2);
        assertThat(result.getTopKeywords().get(0).getKey()).isEqualTo("spring boot");
        assertThat(result.getTopKeywords().get(0).getValue()).isEqualTo(5L);
        assertThat(result.getBehaviorActions()).hasSize(UserBehaviorLog.ActionType.values().length);
        assertThat(result.getBehaviorActions())
                .anySatisfy(item -> {
                    assertThat(item.getKey()).isEqualTo("VIEW_DETAIL");
                    assertThat(item.getLabel()).isEqualTo("查看详情");
                    assertThat(item.getValue()).isEqualTo(8L);
                })
                .anySatisfy(item -> {
                    assertThat(item.getKey()).isEqualTo("BORROW_BOOK");
                    assertThat(item.getLabel()).isEqualTo("发起借阅");
                    assertThat(item.getValue()).isEqualTo(2L);
                });
        assertThat(result.getRecentLoans()).hasSize(1);
        assertThat(result.getRecentLoans().get(0).getBookTitle()).isEqualTo("Refactoring");
    }
}
