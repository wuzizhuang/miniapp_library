package com.example.library.service;

import com.example.library.dto.ReservationCreateDto;
import com.example.library.dto.ReservationDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.impl.ReservationServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ReservationServiceImpl 单元测试。
 *
 * <p>
 * 重点覆盖预约创建的库存分配逻辑（有库存立即锁定 vs 无库存排队），
 * 以及取消预约时的副本释放和转移逻辑。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ReservationService 单元测试")
class ReservationServiceImplTest {

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookCopyRepository bookCopyRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private LoanRepository loanRepository;
    @Mock
    private FineRepository fineRepository;

    @InjectMocks
    private ReservationServiceImpl reservationService;

    private User user;
    private Book book;
    private BookCopy availableCopy;
    private Reservation pendingReservation;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reservationService, "pickupWindowDays", 3);
        ReflectionTestUtils.setField(reservationService, "maxActiveLoans", 5);
        ReflectionTestUtils.setField(reservationService, "defaultLoanDays", 14);

        user = TestDataFactory.createUser(1, "alice");
        book = TestDataFactory.createBook(10, "Effective Java", "978-0-13-468599-1");
        availableCopy = TestDataFactory.createAvailableCopy(100, book);
        pendingReservation = TestDataFactory.createPendingReservation(1, user, book);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // createReservation
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("createReservation — 创建预约")
    class CreateReservation {

        private ReservationCreateDto dto;

        @BeforeEach
        void setUp() {
            dto = new ReservationCreateDto();
            dto.setUserId(1);
            dto.setBookId(10);
            lenient().when(reservationRepository.findActiveReservationsByUserAndBook(eq(1), eq(10), any(Pageable.class)))
                    .thenReturn(List.of());
        }

        @Test
        @DisplayName("成功（有库存）：立即锁定副本，状态变为 AWAITING_PICKUP")
        void success_withAvailableCopy_locksImmediately() {
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(reservationRepository.countActiveReservationsForUser(1)).thenReturn(0L);
            when(bookCopyRepository.findAvailableCopiesByBookIdWithLock(eq(10), any(Pageable.class))).thenReturn(List.of(availableCopy));
            when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
                Reservation saved = inv.getArgument(0);
                if (saved.getReservationId() == null) {
                    saved.setReservationId(9);
                }
                return saved;
            });

            ReservationDto result = reservationService.createReservation(dto);

            // 副本状态应已变为 RESERVED
            assertThat(availableCopy.getStatus()).isEqualTo(BookCopy.CopyStatus.RESERVED);
            // save 被调用：先持久化预约获取 ID，再更新为待取书状态
            verify(bookCopyRepository).save(availableCopy);
            verify(reservationRepository, times(2)).save(any(Reservation.class));
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.ARRIVAL_NOTICE),
                    anyString(),
                    contains("取书"),
                    eq("RESERVATION"),
                    eq("9"),
                    eq("/my/reservations"),
                    eq("RESERVATION_READY_FOR_PICKUP:9"));
        }

        @Test
        @DisplayName("成功（无库存）：预约状态为 PENDING，无副本锁定")
        void success_noInventory_queuedAsPending() {
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(reservationRepository.countActiveReservationsForUser(1)).thenReturn(0L);
            when(bookCopyRepository.findAvailableCopiesByBookIdWithLock(eq(10), any(Pageable.class))).thenReturn(List.of());
            when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
                Reservation saved = inv.getArgument(0);
                if (saved.getReservationId() == null) {
                    saved.setReservationId(9);
                }
                return saved;
            });

            reservationService.createReservation(dto);

            verify(bookCopyRepository, never()).save(any(BookCopy.class));
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("预约成功"),
                    contains("排队"),
                    eq("RESERVATION"),
                    eq("9"),
                    eq("/my/reservations"),
                    eq("RESERVATION_CREATED:9"));
        }

        @Test
        @DisplayName("失败：超过预约上限（5条），抛出 BadRequestException")
        void fail_maxReservationLimitReached() {
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(reservationRepository.countActiveReservationsForUser(1)).thenReturn(5L);

            assertThatThrownBy(() -> reservationService.createReservation(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Max reservation");
        }

        @Test
        @DisplayName("幂等：重复预约同一本书时返回已有预约")
        void duplicateActiveReservation_returnsExistingReservation() {
            pendingReservation.setReservationId(12);
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(reservationRepository.findActiveReservationsByUserAndBook(eq(1), eq(10), any(Pageable.class)))
                    .thenReturn(List.of(pendingReservation));

            ReservationDto result = reservationService.createReservation(dto);

            assertThat(result.getReservationId()).isEqualTo(12);
            verify(reservationRepository, never()).save(any(Reservation.class));
        }

        @Test
        @DisplayName("失败：用户不存在，抛出 ResourceNotFoundException")
        void fail_userNotFound() {
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> reservationService.createReservation(dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // cancelReservation
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("cancelReservation — 取消预约")
    class CancelReservation {

        @Test
        @DisplayName("成功（无已分配副本）：状态改为 CANCELLED")
        void success_noCopyAllocated() {
            when(reservationRepository.findById(1)).thenReturn(Optional.of(pendingReservation));

            reservationService.cancelReservation(1);

            assertThat(pendingReservation.getStatus()).isEqualTo(Reservation.ReservationStatus.CANCELLED);
            verify(bookCopyRepository, never()).save(any(BookCopy.class));
        }

        @Test
        @DisplayName("成功（有已分配副本，无后续预约）：副本释放回 AVAILABLE")
        void success_withCopy_releasedBackToPool() {
            pendingReservation.setStatus(Reservation.ReservationStatus.AWAITING_PICKUP);
            pendingReservation.setAllocatedCopy(availableCopy);
            availableCopy.setStatus(BookCopy.CopyStatus.RESERVED);

            when(reservationRepository.findById(1)).thenReturn(Optional.of(pendingReservation));

            reservationService.cancelReservation(1);

            assertThat(availableCopy.getStatus()).isEqualTo(BookCopy.CopyStatus.AVAILABLE);
            verify(bookCopyRepository).save(availableCopy);
        }

        @Test
        @DisplayName("失败：预约已完成（FULFILLED），抛出 BadRequestException")
        void fail_alreadyFulfilled() {
            pendingReservation.setStatus(Reservation.ReservationStatus.FULFILLED);
            when(reservationRepository.findById(1)).thenReturn(Optional.of(pendingReservation));

            assertThatThrownBy(() -> reservationService.cancelReservation(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot cancel finished");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // fulfillReservation
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("fulfillReservation — 确认取书")
    class FulfillReservation {

        @Test
        @DisplayName("成功：生成借阅并将副本改为 BORROWED")
        void success_createsLoan() {
            pendingReservation.setStatus(Reservation.ReservationStatus.AWAITING_PICKUP);
            pendingReservation.setAllocatedCopy(availableCopy);
            availableCopy.setStatus(BookCopy.CopyStatus.RESERVED);

            when(reservationRepository.findById(1)).thenReturn(Optional.of(pendingReservation));
            when(fineRepository.countPendingFinesForUser(1)).thenReturn(0L);
            when(loanRepository.countActiveLoansForUser(1)).thenReturn(0L);
            when(loanRepository.save(any(Loan.class))).thenAnswer(inv -> inv.getArgument(0));

            reservationService.fulfillReservation(1);

            assertThat(pendingReservation.getStatus()).isEqualTo(Reservation.ReservationStatus.FULFILLED);
            assertThat(availableCopy.getStatus()).isEqualTo(BookCopy.CopyStatus.BORROWED);
            verify(loanRepository).save(any(Loan.class));
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("预约取书已完成"),
                    contains("应还日期"),
                    eq("LOAN"),
                    isNull(),
                    eq("/my/loan-tracking"),
                    isNull());
        }

        @Test
        @DisplayName("失败：非待取书状态不可履约")
        void fail_notAwaitingPickup() {
            when(reservationRepository.findById(1)).thenReturn(Optional.of(pendingReservation));

            assertThatThrownBy(() -> reservationService.fulfillReservation(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("awaiting pickup");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // allocateInventoryForPendingReservations
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("allocateInventoryForPendingReservations — 库存分配")
    class AllocateInventory {

        @Test
        @DisplayName("有待处理预约：副本锁定给第一个预约，返回 true")
        void pendingExists_returnsTrue() {
            User nextUser = TestDataFactory.createUser(2, "bob");
            Reservation nextReservation = TestDataFactory.createPendingReservation(2, nextUser, book);

            when(reservationRepository.findPendingReservationsForBookWithLock(eq(book.getBookId()), any(Pageable.class)))
                    .thenReturn(List.of(nextReservation));

            boolean result = reservationService.allocateInventoryForPendingReservations(availableCopy);

            assertThat(result).isTrue();
            assertThat(availableCopy.getStatus()).isEqualTo(BookCopy.CopyStatus.RESERVED);
            verify(reservationRepository).save(nextReservation);
            verify(notificationService).sendNotification(
                    eq(2),
                    eq(Notification.NotificationType.ARRIVAL_NOTICE),
                    anyString(),
                    contains("取书"),
                    eq("RESERVATION"),
                    eq("2"),
                    eq("/my/reservations"),
                    eq("RESERVATION_READY_FOR_PICKUP:2"));
        }

        @Test
        @DisplayName("无待处理预约：返回 false，副本不作更改")
        void noPending_returnsFalse() {
            when(reservationRepository.findPendingReservationsForBookWithLock(eq(book.getBookId()), any(Pageable.class)))
                    .thenReturn(List.of());

            boolean result = reservationService.allocateInventoryForPendingReservations(availableCopy);

            assertThat(result).isFalse();
            assertThat(availableCopy.getStatus()).isEqualTo(BookCopy.CopyStatus.AVAILABLE);
        }
    }

    @Nested
    @DisplayName("getAllReservations — 后台检索")
    class GetAllReservations {

        @Test
        @DisplayName("成功：按状态和关键词查询")
        void success_searchByStatusAndKeyword() {
            Pageable pageable = PageRequest.of(0, 10);
            when(reservationRepository.searchForAdmin(Reservation.ReservationStatus.PENDING, "java", pageable))
                    .thenReturn(new PageImpl<>(List.of(pendingReservation)));

            Page<ReservationDto> result = reservationService.getAllReservations(
                    Reservation.ReservationStatus.PENDING,
                    "java",
                    pageable);

            assertThat(result.getContent()).hasSize(1);
            verify(reservationRepository).searchForAdmin(Reservation.ReservationStatus.PENDING, "java", pageable);
        }

        @Test
        @DisplayName("成功：空关键词归一化为 null")
        void success_blankKeywordNormalized() {
            Pageable pageable = PageRequest.of(0, 10);
            when(reservationRepository.searchForAdmin(null, null, pageable))
                    .thenReturn(Page.empty(pageable));

            reservationService.getAllReservations(null, "   ", pageable);

            verify(reservationRepository).searchForAdmin(null, null, pageable);
        }
    }
}
