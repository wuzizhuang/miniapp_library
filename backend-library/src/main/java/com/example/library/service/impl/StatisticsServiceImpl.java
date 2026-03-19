package com.example.library.service.impl;

import com.example.library.dto.DashboardAnalyticsDto;
import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.DashboardRecentLoanDto;
import com.example.library.dto.DashboardStatsDto;
import com.example.library.dto.DashboardTrendPointDto;
import com.example.library.entity.Fine;
import com.example.library.entity.Loan;
import com.example.library.entity.Reservation;
import com.example.library.entity.UserBehaviorLog;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.FineRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.ReservationRepository;
import com.example.library.repository.SearchHistoryRepository;
import com.example.library.repository.UserBehaviorLogRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Default implementation for admin statistics.
 */
@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {

    private final UserRepository userRepository;
    private final LoanRepository loanRepository;
    private final BookCopyRepository bookCopyRepository;
    private final ReservationRepository reservationRepository;
    private final FineRepository fineRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final UserBehaviorLogRepository userBehaviorLogRepository;

    /**
     * Returns core dashboard statistics.
     */
    @Override
    @Cacheable(cacheNames = "dashboardStats")
    @Transactional(readOnly = true)
    public DashboardStatsDto getCoreDashboardStatistics() {
        DashboardStatsDto stats = new DashboardStatsDto();

        stats.setTotalUsers(userRepository.count());

        stats.setActiveLoans(loanRepository.countAllActiveAndOverdueLoans());

        stats.setOverdueLoans(loanRepository.countActualOverdueLoans());

        stats.setAvailableCopies(bookCopyRepository.countTotalAvailableCopies());

        stats.setPendingReservations(reservationRepository.countTotalPendingReservations());

        stats.setTotalPendingFines(fineRepository.sumTotalPendingFines());

        return stats;
    }

    /**
     * Returns analytics payload for dashboard visualizations.
     */
    @Override
    @Cacheable(cacheNames = "dashboardAnalytics")
    @Transactional(readOnly = true)
    public DashboardAnalyticsDto getDashboardAnalytics() {
        DashboardAnalyticsDto analytics = new DashboardAnalyticsDto();
        analytics.setSummary(getCoreDashboardStatistics());
        analytics.setLoanTrend(buildLoanTrend());
        analytics.setReservationStatus(buildReservationBreakdown());
        analytics.setFineStatus(buildFineBreakdown());
        analytics.setTopKeywords(buildTopKeywordBreakdown());
        analytics.setBehaviorActions(buildBehaviorBreakdown());
        analytics.setRecentLoans(loanRepository.findAllByOrderByBorrowDateDescLoanIdDesc(PageRequest.of(0, 8))
                .stream()
                .map(this::toRecentLoanDto)
                .toList());
        return analytics;
    }

    private List<DashboardTrendPointDto> buildLoanTrend() {
        LocalDate startDate = LocalDate.now().minusDays(6);
        Map<LocalDate, Long> borrowCounts = toDateCountMap(loanRepository.countBorrowedByDateSince(startDate));
        Map<LocalDate, Long> returnCounts = toDateCountMap(loanRepository.countReturnedByDateSince(startDate));

        return startDate.datesUntil(LocalDate.now().plusDays(1))
                .map(date -> {
                    DashboardTrendPointDto point = new DashboardTrendPointDto();
                    point.setDate(date);
                    point.setBorrowCount(borrowCounts.getOrDefault(date, 0L));
                    point.setReturnCount(returnCounts.getOrDefault(date, 0L));
                    return point;
                })
                .toList();
    }

    private List<DashboardBreakdownItemDto> buildReservationBreakdown() {
        Map<String, Long> counts = toEnumCountMap(reservationRepository.countGroupedByStatus());

        return Arrays.stream(Reservation.ReservationStatus.values())
                .map(status -> createBreakdownItem(status.name(), status.name(), counts.getOrDefault(status.name(), 0L)))
                .toList();
    }

    private List<DashboardBreakdownItemDto> buildFineBreakdown() {
        Map<String, Long> counts = toEnumCountMap(fineRepository.countGroupedByStatus());

        return Arrays.stream(Fine.FineStatus.values())
                .map(status -> createBreakdownItem(status.name(), status.name(), counts.getOrDefault(status.name(), 0L)))
                .toList();
    }

    private List<DashboardBreakdownItemDto> buildTopKeywordBreakdown() {
        return searchHistoryRepository.findTopKeywordsWithCount(PageRequest.of(0, 8))
                .stream()
                .map(row -> createBreakdownItem(String.valueOf(row[0]), String.valueOf(row[0]), (Long) row[1]))
                .toList();
    }

    private List<DashboardBreakdownItemDto> buildBehaviorBreakdown() {
        Map<String, Long> counts = toEnumCountMap(userBehaviorLogRepository.countGroupedByActionType());

        return Arrays.stream(UserBehaviorLog.ActionType.values())
                .map(actionType -> createBreakdownItem(
                        actionType.name(),
                        describeActionType(actionType),
                        counts.getOrDefault(actionType.name(), 0L)))
                .toList();
    }

    private DashboardBreakdownItemDto createBreakdownItem(String key, String label, Long value) {
        DashboardBreakdownItemDto item = new DashboardBreakdownItemDto();
        item.setKey(key);
        item.setLabel(label);
        item.setValue(value);
        return item;
    }

    private String describeActionType(UserBehaviorLog.ActionType actionType) {
        return switch (actionType) {
            case VIEW_DETAIL -> "查看详情";
            case ADD_TO_SHELF -> "加入书架";
            case CLICK_PREVIEW -> "点击预览";
            case SHARE -> "分享";
            case BORROW_BOOK -> "发起借阅";
            case RESERVE_BOOK -> "发起预约";
        };
    }

    private DashboardRecentLoanDto toRecentLoanDto(Loan loan) {
        DashboardRecentLoanDto dto = new DashboardRecentLoanDto();
        dto.setLoanId(loan.getLoanId());
        dto.setBookTitle(loan.getCopy().getBook().getTitle());
        dto.setBookCoverUrl(loan.getCopy().getBook().getCoverUrl());
        dto.setUserFullName(loan.getUser().getFullName() == null || loan.getUser().getFullName().isBlank()
                ? loan.getUser().getUsername()
                : loan.getUser().getFullName());
        dto.setBorrowDate(loan.getBorrowDate());
        dto.setDueDate(loan.getDueDate());
        dto.setStatus(loan.getStatus().name());
        return dto;
    }

    private Map<LocalDate, Long> toDateCountMap(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
                row -> (LocalDate) row[0],
                row -> (Long) row[1]));
    }

    private Map<String, Long> toEnumCountMap(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
                row -> String.valueOf(row[0]),
                row -> (Long) row[1],
                (left, right) -> right));
    }
}
