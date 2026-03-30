package com.example.library.service;

import com.example.library.dto.FineDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.FineRepository;
import com.example.library.service.impl.FineServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * FineServiceImpl 单元测试。
 *
 * <p>
 * 覆盖：查询罚款、豁免（WAIVE）/支付（PAY）的状态机校验。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FineService 单元测试")
class FineServiceImplTest {

    @Mock
    private FineRepository fineRepository;

    @InjectMocks
    private FineServiceImpl fineService;

    private User user;
    private Loan loan;
    private Fine pendingFine;

    @BeforeEach
    void setUp() {
        user = TestDataFactory.createUser(1, "alice");
        Book book = TestDataFactory.createBook(10, "Clean Code", "978-0");
        BookCopy copy = TestDataFactory.createAvailableCopy(100, book);
        loan = TestDataFactory.createActiveLoan(1, user, copy);
        pendingFine = TestDataFactory.createPendingFine(1, user, loan, BigDecimal.valueOf(5.00));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 查询类
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("查询方法")
    class QueryMethods {

        @Test
        @DisplayName("getFinesByUser — 成功：返回用户罚款分页")
        void getFinesByUser_success() {
            when(fineRepository.findByUserUserId(eq(1), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(pendingFine)));

            Page<FineDto> result = fineService.getFinesByUser(1, 0, 10);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getFineId()).isEqualTo(1);
            assertThat(result.getContent().get(0).getBookTitle()).isEqualTo("Clean Code");
            assertThat(result.getContent().get(0).getType()).isEqualTo("OVERDUE");
        }

        @Test
        @DisplayName("getAllFines — 成功：按状态过滤")
        void getAllFines_filterByStatus() {
            when(fineRepository.findByStatus(eq(Fine.FineStatus.PENDING), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(pendingFine)));

            Page<FineDto> result = fineService.getAllFines(0, 10, Fine.FineStatus.PENDING, null);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getStatus()).isEqualTo(Fine.FineStatus.PENDING);
        }

        @Test
        @DisplayName("getAllFines — 成功：按关键词搜索")
        void getAllFines_searchByKeyword() {
            when(fineRepository.searchForAdmin(eq(null), eq("alice"), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(pendingFine)));

            Page<FineDto> result = fineService.getAllFines(0, 10, null, "alice");

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getFineId()).isEqualTo(1);
            verify(fineRepository).searchForAdmin(eq(null), eq("alice"), any(Pageable.class));
        }

        @Test
        @DisplayName("getTotalPendingFines — 成功：返回全馆待缴总额")
        void getTotalPendingFines_success() {
            when(fineRepository.sumTotalPendingFines()).thenReturn(BigDecimal.valueOf(88.50));

            BigDecimal result = fineService.getTotalPendingFines();

            assertThat(result).isEqualByComparingTo("88.50");
        }

        @Test
        @DisplayName("getFineById — 成功：返回罚款 DTO")
        void getFineById_success() {
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));

            FineDto dto = fineService.getFineById(1);

            assertThat(dto.getFineId()).isEqualTo(1);
            assertThat(dto.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(5.00));
            assertThat(dto.getStatus()).isEqualTo(Fine.FineStatus.PENDING);
            assertThat(dto.getBookTitle()).isEqualTo("Clean Code");
            assertThat(dto.getType()).isEqualTo("OVERDUE");
        }

        @Test
        @DisplayName("getFineById — 失败：不存在，抛出 ResourceNotFoundException")
        void getFineById_notFound() {
            when(fineRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> fineService.getFineById(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // waiveFine
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("waiveFine — 豁免罚款")
    class WaiveFine {

        @Test
        @DisplayName("成功：PENDING → WAIVED，支付日期自动设置")
        void success_pendingToWaived() {
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));
            when(fineRepository.save(any(Fine.class))).thenReturn(pendingFine);

            FineDto result = fineService.waiveFine(1);

            assertThat(pendingFine.getStatus()).isEqualTo(Fine.FineStatus.WAIVED);
            assertThat(pendingFine.getDatePaid()).isNotNull();
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("失败：已支付（PAID）罚款无法豁免，抛出 BadRequestException")
        void fail_alreadyPaid() {
            pendingFine.setStatus(Fine.FineStatus.PAID);
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));

            assertThatThrownBy(() -> fineService.waiveFine(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already been paid");

            verify(fineRepository, never()).save(any(Fine.class));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // payFine
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("payFine — 支付罚款")
    class PayFine {

        @Test
        @DisplayName("成功：PENDING → PAID")
        void success_pendingToPaid() {
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));
            when(fineRepository.save(any(Fine.class))).thenReturn(pendingFine);

            FineDto result = fineService.payFine(1);

            assertThat(pendingFine.getStatus()).isEqualTo(Fine.FineStatus.PAID);
            assertThat(pendingFine.getDatePaid()).isNotNull();
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("失败：已支付（PAID），抛出 BadRequestException")
        void fail_alreadyPaid() {
            pendingFine.setStatus(Fine.FineStatus.PAID);
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));

            assertThatThrownBy(() -> fineService.payFine(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already been paid");
        }

        @Test
        @DisplayName("失败：已豁免（WAIVED），抛出 BadRequestException")
        void fail_alreadyWaived() {
            pendingFine.setStatus(Fine.FineStatus.WAIVED);
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));

            assertThatThrownBy(() -> fineService.payFine(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("waived");
        }

        @Test
        @DisplayName("成功：遗失图书罚款映射为 LOST 类型")
        void mapsLostType() {
            pendingFine.getLoan().setStatus(Loan.LoanStatus.LOST);
            pendingFine.setDateIssued(LocalDate.now());
            when(fineRepository.findById(1)).thenReturn(Optional.of(pendingFine));

            FineDto dto = fineService.getFineById(1);

            assertThat(dto.getType()).isEqualTo("LOST");
        }
    }
}
