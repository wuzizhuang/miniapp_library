package com.example.library.service;

import com.example.library.dto.user.UserOverviewDto;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.entity.Loan;
import com.example.library.entity.Reservation;
import com.example.library.entity.ServiceAppointment;
import com.example.library.entity.User;
import com.example.library.repository.FineRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.NotificationRepository;
import com.example.library.repository.ReservationRepository;
import com.example.library.repository.ServiceAppointmentRepository;
import com.example.library.repository.UserFavoriteRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.UserOverviewServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserOverviewService 单元测试")
class UserOverviewServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private FineRepository fineRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserFavoriteRepository userFavoriteRepository;

    @Mock
    private ServiceAppointmentRepository serviceAppointmentRepository;

    @InjectMocks
    private UserOverviewServiceImpl userOverviewService;

    private User user;
    private Book book;
    private BookCopy copy;

    @BeforeEach
    void setUp() {
        user = TestDataFactory.createUser(1, "reader");
        book = TestDataFactory.createBook(10, "Domain-Driven Design", "9780321125217");
        copy = TestDataFactory.createAvailableCopy(100, book);
    }

    @Test
    @DisplayName("getOverview — 成功聚合借阅、预约、罚款、通知、收藏和服务预约统计")
    void getOverview_success() {
        Loan dueSoonLoan = TestDataFactory.createActiveLoan(8, user, copy);
        dueSoonLoan.setDueDate(LocalDate.now().plusDays(2));

        Loan laterLoan = TestDataFactory.createActiveLoan(9, user, copy);
        laterLoan.setDueDate(LocalDate.now().plusDays(10));

        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(loanRepository.findByUserUserIdAndStatusInOrderByDueDateAsc(
                1,
                List.of(Loan.LoanStatus.ACTIVE, Loan.LoanStatus.OVERDUE)))
                .thenReturn(List.of(dueSoonLoan, laterLoan));
        when(reservationRepository.countByUserUserIdAndStatusIn(
                1,
                List.of(Reservation.ReservationStatus.PENDING, Reservation.ReservationStatus.AWAITING_PICKUP)))
                .thenReturn(3L);
        when(reservationRepository.countByUserUserIdAndStatusIn(
                1,
                List.of(Reservation.ReservationStatus.AWAITING_PICKUP)))
                .thenReturn(1L);
        when(fineRepository.countPendingFinesForUser(1)).thenReturn(2L);
        when(fineRepository.getTotalPendingFinesForUser(1)).thenReturn(BigDecimal.valueOf(12.50));
        when(notificationRepository.countByUserUserIdAndIsReadFalse(1)).thenReturn(4L);
        when(userFavoriteRepository.countByUserUserId(1)).thenReturn(6L);
        when(serviceAppointmentRepository.countByUserUserIdAndStatusIn(
                1,
                List.of(ServiceAppointment.AppointmentStatus.PENDING)))
                .thenReturn(2L);
        when(serviceAppointmentRepository.countByUserUserIdAndStatus(
                1,
                ServiceAppointment.AppointmentStatus.COMPLETED))
                .thenReturn(5L);

        UserOverviewDto result = userOverviewService.getOverview(1);

        assertThat(result.getUserId()).isEqualTo(1);
        assertThat(result.getActiveLoanCount()).isEqualTo(2L);
        assertThat(result.getDueSoonLoanCount()).isEqualTo(1L);
        assertThat(result.getDueSoonLoans()).hasSize(1);
        assertThat(result.getDueSoonLoans().get(0).getBookTitle()).isEqualTo("Domain-Driven Design");
        assertThat(result.getActiveReservationCount()).isEqualTo(3L);
        assertThat(result.getReadyReservationCount()).isEqualTo(1L);
        assertThat(result.getPendingFineCount()).isEqualTo(2L);
        assertThat(result.getPendingFineTotal()).isEqualByComparingTo("12.50");
        assertThat(result.getUnreadNotificationCount()).isEqualTo(4L);
        assertThat(result.getFavoriteCount()).isEqualTo(6L);
        assertThat(result.getPendingServiceAppointmentCount()).isEqualTo(2L);
        assertThat(result.getCompletedServiceAppointmentCount()).isEqualTo(5L);
    }

    @Test
    @DisplayName("getOverview — 临近到期数量统计完整，预览列表最多保留三条")
    void getOverview_countsAllDueSoonLoansBeforePreviewLimit() {
        Loan dueSoonLoan1 = TestDataFactory.createActiveLoan(8, user, copy);
        dueSoonLoan1.setDueDate(LocalDate.now());

        Loan dueSoonLoan2 = TestDataFactory.createActiveLoan(9, user, copy);
        dueSoonLoan2.setDueDate(LocalDate.now().plusDays(1));

        Loan dueSoonLoan3 = TestDataFactory.createActiveLoan(10, user, copy);
        dueSoonLoan3.setDueDate(LocalDate.now().plusDays(2));

        Loan dueSoonLoan4 = TestDataFactory.createActiveLoan(11, user, copy);
        dueSoonLoan4.setDueDate(LocalDate.now().plusDays(3));

        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(loanRepository.findByUserUserIdAndStatusInOrderByDueDateAsc(
                1,
                List.of(Loan.LoanStatus.ACTIVE, Loan.LoanStatus.OVERDUE)))
                .thenReturn(List.of(dueSoonLoan1, dueSoonLoan2, dueSoonLoan3, dueSoonLoan4));
        when(reservationRepository.countByUserUserIdAndStatusIn(
                1,
                List.of(Reservation.ReservationStatus.PENDING, Reservation.ReservationStatus.AWAITING_PICKUP)))
                .thenReturn(0L);
        when(reservationRepository.countByUserUserIdAndStatusIn(
                1,
                List.of(Reservation.ReservationStatus.AWAITING_PICKUP)))
                .thenReturn(0L);
        when(serviceAppointmentRepository.countByUserUserIdAndStatusIn(
                1,
                List.of(ServiceAppointment.AppointmentStatus.PENDING)))
                .thenReturn(0L);
        when(serviceAppointmentRepository.countByUserUserIdAndStatus(
                1,
                ServiceAppointment.AppointmentStatus.COMPLETED))
                .thenReturn(0L);

        UserOverviewDto result = userOverviewService.getOverview(1);

        assertThat(result.getDueSoonLoanCount()).isEqualTo(4L);
        assertThat(result.getDueSoonLoans()).hasSize(3);
        assertThat(result.getDueSoonLoans())
                .extracting(item -> item.getLoanId())
                .containsExactly(8, 9, 10);
    }
}
