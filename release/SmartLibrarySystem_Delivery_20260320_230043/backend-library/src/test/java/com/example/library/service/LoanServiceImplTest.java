package com.example.library.service;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.impl.LoanServiceImpl;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * LoanServiceImpl 单元测试。
 *
 * <p>
 * 重点覆盖 createLoan 的 6 种拒绝场景（书籍下架/副本不可用/有未缴罚款/超借阅限制/被他人预约），
 * 以及 returnLoan（含逾期罚款生成）、renewLoan、markLoanAsLost。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("LoanService 单元测试")
class LoanServiceImplTest {

    @Mock
    private LoanRepository loanRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookCopyRepository bookCopyRepository;
    @Mock
    private FineRepository fineRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private ReservationService reservationService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private LoanServiceImpl loanService;

    private User user;
    private Book book;
    private BookCopy copy;
    private Loan activeLoan;

    @BeforeEach
    void setUp() {
        // 注入 @Value 配置（反射方式绕过 Spring 容器）
        ReflectionTestUtils.setField(loanService, "maxActiveLoans", 5);
        ReflectionTestUtils.setField(loanService, "defaultLoanDays", 14);
        ReflectionTestUtils.setField(loanService, "finePerDay", BigDecimal.valueOf(1.00));

        user = TestDataFactory.createUser(1, "alice");
        book = TestDataFactory.createBook(10, "Effective Java", "978-0-13-468599-1");
        copy = TestDataFactory.createAvailableCopy(100, book);
        activeLoan = TestDataFactory.createActiveLoan(1, user, copy);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // getAllLoans / getLoansByUser / getLoanById
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("查询类方法")
    class QueryMethods {

        @Test
        @DisplayName("getAllLoans — 成功返回分页列表")
        void getAllLoans_success() {
            when(loanRepository.findAll(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(activeLoan)));

            Page<LoanDto> result = loanService.getAllLoans(0, 10, "borrowDate", "DESC", null);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getLoanId()).isEqualTo(1);
        }

        @Test
        @DisplayName("getLoansByUser — 用户存在，成功返回")
        void getLoansByUser_success() {
            when(userRepository.existsById(1)).thenReturn(true);
            when(loanRepository.findByUserUserId(eq(1), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(activeLoan)));

            Page<LoanDto> result = loanService.getLoansByUser(1, 0, 10);

            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("getLoansByUser — 用户不存在，抛出 ResourceNotFoundException")
        void getLoansByUser_userNotFound() {
            when(userRepository.existsById(999)).thenReturn(false);

            assertThatThrownBy(() -> loanService.getLoansByUser(999, 0, 10))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("getLoanById — 成功返回 DTO")
        void getLoanById_success() {
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));

            LoanDto result = loanService.getLoanById(1);

            assertThat(result.getLoanId()).isEqualTo(1);
            assertThat(result.getUserId()).isEqualTo(1);
            assertThat(result.getBookId()).isEqualTo(10);
        }

        @Test
        @DisplayName("getLoanById — 不存在，抛出 ResourceNotFoundException")
        void getLoanById_notFound() {
            when(loanRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> loanService.getLoanById(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // createLoan — 核心业务规则测试
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("createLoan — 借阅业务规则")
    class CreateLoan {

        private LoanCreateDto dto;

        @BeforeEach
        void setUp() {
            dto = new LoanCreateDto();
            dto.setUserId(1);
            dto.setCopyId(100);
        }

        @Test
        @DisplayName("成功：副本可用 & 无罚款 & 未超限")
        void success_allConditionsMet() {
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(bookCopyRepository.findByCopyIdWithLock(100)).thenReturn(Optional.of(copy));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(0L);
            when(reservationRepository.findPendingReservationsForBook(anyInt())).thenReturn(List.of());
            when(loanRepository.countActiveLoansForUser(1)).thenReturn(2L);
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            LoanDto result = loanService.createLoan(dto);

            assertThat(result).isNotNull();
            verify(bookCopyRepository).save(copy); // copy 状态改为 BORROWED
            verify(loanRepository).save(any(Loan.class));
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("借阅成功"),
                    contains("应还日期"),
                    eq("LOAN"),
                    eq("1"),
                    eq("/my/loan-tracking"),
                    eq("LOAN_BORROW_SUCCESS"));
        }

        @Test
        @DisplayName("失败：书籍状态为 INACTIVE，抛出 BadRequestException")
        void fail_inactiveBook() {
            book.setStatus(Book.BookStatus.INACTIVE);
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(bookCopyRepository.findByCopyIdWithLock(100)).thenReturn(Optional.of(copy));

            assertThatThrownBy(() -> loanService.createLoan(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("inactive");
        }

        @Test
        @DisplayName("失败：副本状态为 BORROWED，抛出 BadRequestException")
        void fail_copyNotAvailable() {
            copy.setStatus(BookCopy.CopyStatus.BORROWED);
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(bookCopyRepository.findByCopyIdWithLock(100)).thenReturn(Optional.of(copy));

            assertThatThrownBy(() -> loanService.createLoan(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("not available");
        }

        @Test
        @DisplayName("失败：用户有未缴罚款，抛出 BadRequestException")
        void fail_pendingFines() {
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(bookCopyRepository.findByCopyIdWithLock(100)).thenReturn(Optional.of(copy));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(1L);

            assertThatThrownBy(() -> loanService.createLoan(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("pending fines");
        }

        @Test
        @DisplayName("失败：该书已被其他用户预约，抛出 BadRequestException")
        void fail_reservedByOtherUser() {
            User otherUser = TestDataFactory.createUser(2, "bob");
            Reservation reservation = TestDataFactory.createPendingReservation(1, otherUser, book);

            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(bookCopyRepository.findByCopyIdWithLock(100)).thenReturn(Optional.of(copy));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(0L);
            when(reservationRepository.findPendingReservationsForBook(anyInt())).thenReturn(List.of(reservation));

            assertThatThrownBy(() -> loanService.createLoan(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("预约")
                    .satisfies(error -> assertThat(error.getMessage()).doesNotContain("User ID"));
        }

        @Test
        @DisplayName("失败：已达到最大借阅数，抛出 BadRequestException")
        void fail_maxLoansReached() {
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(bookCopyRepository.findByCopyIdWithLock(100)).thenReturn(Optional.of(copy));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(0L);
            when(reservationRepository.findPendingReservationsForBook(anyInt())).thenReturn(List.of());
            when(loanRepository.countActiveLoansForUser(1)).thenReturn(5L); // maxActiveLoans = 5

            assertThatThrownBy(() -> loanService.createLoan(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("maximum");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // returnLoan
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("returnLoan — 归还借阅")
    class ReturnLoan {

        @Test
        @DisplayName("成功：按时归还，无罚款产生")
        void success_onTime_noFine() {
            activeLoan.setDueDate(LocalDate.now().plusDays(5));
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));
            when(reservationService.allocateInventoryForPendingReservations(copy)).thenReturn(false);
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            LoanDto result = loanService.returnLoan(1);

            assertThat(result.getStatus()).isEqualTo(Loan.LoanStatus.RETURNED);
            verify(fineRepository, never()).save(any(Fine.class));
        }

        @Test
        @DisplayName("成功：逾期归还，罚款记录自动创建")
        void success_overdue_fineCreated() {
            activeLoan.setDueDate(LocalDate.now().minusDays(3)); // 逾期 3 天
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));
            when(reservationService.allocateInventoryForPendingReservations(copy)).thenReturn(false);
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            loanService.returnLoan(1);

            verify(fineRepository).save(argThat(fine -> fine.getAmount().compareTo(BigDecimal.valueOf(3.00)) == 0 // 1元/天
                                                                                                                  // *
                                                                                                                  // 3天
            ));
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("逾期罚款已生成"),
                    contains("罚款"),
                    eq("FINE"),
                    isNull(),
                    eq("/my/fines"),
                    eq("FINE_OVERDUE_CREATED"));
        }

        @Test
        @DisplayName("失败：借阅已归还，抛出 BadRequestException")
        void fail_alreadyReturned() {
            activeLoan.setStatus(Loan.LoanStatus.RETURNED);
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));

            assertThatThrownBy(() -> loanService.returnLoan(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already returned");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // renewLoan
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("renewLoan — 续借")
    class RenewLoan {

        @Test
        @DisplayName("成功：续借后归还日顺延 14 天")
        void success_dueDateExtended() {
            activeLoan.setDueDate(LocalDate.now().plusDays(3));
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(0L);
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            LoanDto result = loanService.renewLoan(1);

            assertThat(activeLoan.getDueDate()).isAfterOrEqualTo(LocalDate.now().plusDays(13));
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("失败：借阅非活跃状态，抛出 BadRequestException")
        void fail_notActive() {
            activeLoan.setStatus(Loan.LoanStatus.RETURNED);
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));

            assertThatThrownBy(() -> loanService.renewLoan(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("active loans");
        }

        @Test
        @DisplayName("失败：已逾期，抛出 BadRequestException")
        void fail_overdue() {
            activeLoan.setDueDate(LocalDate.now().minusDays(1));
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));

            assertThatThrownBy(() -> loanService.renewLoan(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Overdue");
        }

        @Test
        @DisplayName("失败：有未缴罚款，抛出 BadRequestException")
        void fail_pendingFines() {
            activeLoan.setDueDate(LocalDate.now().plusDays(3));
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(1L);

            assertThatThrownBy(() -> loanService.renewLoan(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("pending fines");
        }

        @Test
        @DisplayName("失败：已有其他用户预约同一本书，不允许续借")
        void fail_conflictingReservationExists() {
            activeLoan.setDueDate(LocalDate.now().plusDays(3));
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(0L);
            when(reservationRepository.existsConflictingActiveReservationForBook(10, 1)).thenReturn(true);

            assertThatThrownBy(() -> loanService.renewLoan(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("cannot be renewed");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // markLoanAsLost
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("markLoanAsLost — 报告丢失")
    class MarkLoanAsLost {

        @Test
        @DisplayName("成功：借阅状态改为 LOST，副本状态改为 LOST，罚款 = 书本价格")
        void success_fineEqualsToCopyPrice() {
            copy.setPrice(BigDecimal.valueOf(59.90));
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            loanService.markLoanAsLost(1);

            assertThat(activeLoan.getStatus()).isEqualTo(Loan.LoanStatus.LOST);
            assertThat(copy.getStatus()).isEqualTo(BookCopy.CopyStatus.LOST);
            verify(fineRepository).save(argThat(fine -> fine.getAmount().compareTo(BigDecimal.valueOf(59.90)) == 0));
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("图书遗失已登记"),
                    contains("赔付"),
                    eq("FINE"),
                    isNull(),
                    eq("/my/fines"),
                    eq("FINE_LOST_CREATED"));
        }

        @Test
        @DisplayName("失败：借阅已归还，抛出 BadRequestException")
        void fail_alreadyReturned() {
            activeLoan.setStatus(Loan.LoanStatus.RETURNED);
            when(loanRepository.findById(1)).thenReturn(Optional.of(activeLoan));

            assertThatThrownBy(() -> loanService.markLoanAsLost(1))
                    .isInstanceOf(BadRequestException.class);
        }
    }
}
