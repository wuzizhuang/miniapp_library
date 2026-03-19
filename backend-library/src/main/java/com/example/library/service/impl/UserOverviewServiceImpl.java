package com.example.library.service.impl;

import com.example.library.dto.user.UserOverviewDueLoanDto;
import com.example.library.dto.user.UserOverviewDto;
import com.example.library.entity.Loan;
import com.example.library.entity.Reservation;
import com.example.library.entity.ServiceAppointment;
import com.example.library.entity.User;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.FineRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.NotificationRepository;
import com.example.library.repository.ReservationRepository;
import com.example.library.repository.ServiceAppointmentRepository;
import com.example.library.repository.UserFavoriteRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.UserOverviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Default user overview aggregation service.
 */
@Service
@RequiredArgsConstructor
public class UserOverviewServiceImpl implements UserOverviewService {

    private static final List<Loan.LoanStatus> ACTIVE_LOAN_STATUSES = List.of(
            Loan.LoanStatus.ACTIVE,
            Loan.LoanStatus.OVERDUE);
    private static final List<Reservation.ReservationStatus> ACTIVE_RESERVATION_STATUSES = List.of(
            Reservation.ReservationStatus.PENDING,
            Reservation.ReservationStatus.AWAITING_PICKUP);
    private static final List<ServiceAppointment.AppointmentStatus> ACTIVE_APPOINTMENT_STATUSES = List.of(
            ServiceAppointment.AppointmentStatus.PENDING);

    private final UserRepository userRepository;
    private final LoanRepository loanRepository;
    private final ReservationRepository reservationRepository;
    private final FineRepository fineRepository;
    private final NotificationRepository notificationRepository;
    private final UserFavoriteRepository userFavoriteRepository;
    private final ServiceAppointmentRepository serviceAppointmentRepository;

    @Override
    @Transactional(readOnly = true)
    public UserOverviewDto getOverview(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        LocalDate today = LocalDate.now();
        List<Loan> activeLoans = loanRepository.findByUserUserIdAndStatusInOrderByDueDateAsc(userId, ACTIVE_LOAN_STATUSES);
        List<UserOverviewDueLoanDto> dueSoonLoanPreview = activeLoans.stream()
                .filter(loan -> loan.getDueDate() != null)
                .map(loan -> toDueSoonLoan(loan, today))
                .filter(item -> item.getDaysRemaining() != null && item.getDaysRemaining() >= 0 && item.getDaysRemaining() <= 3)
                .limit(3)
                .toList();
        long dueSoonLoanCount = activeLoans.stream()
                .filter(loan -> loan.getDueDate() != null)
                .map(loan -> ChronoUnit.DAYS.between(today, loan.getDueDate()))
                .filter(daysRemaining -> daysRemaining >= 0 && daysRemaining <= 3)
                .count();

        UserOverviewDto dto = new UserOverviewDto();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setActiveLoanCount((long) activeLoans.size());
        dto.setDueSoonLoanCount(dueSoonLoanCount);
        dto.setDueSoonLoans(dueSoonLoanPreview);
        dto.setActiveReservationCount(reservationRepository.countByUserUserIdAndStatusIn(userId, ACTIVE_RESERVATION_STATUSES));
        dto.setReadyReservationCount(reservationRepository.countByUserUserIdAndStatusIn(
                userId,
                List.of(Reservation.ReservationStatus.AWAITING_PICKUP)));
        dto.setPendingFineCount(defaultLong(fineRepository.countPendingFinesForUser(userId)));
        dto.setPendingFineTotal(defaultAmount(fineRepository.getTotalPendingFinesForUser(userId)));
        dto.setUnreadNotificationCount(defaultLong(notificationRepository.countByUserUserIdAndIsReadFalse(userId)));
        dto.setFavoriteCount(userFavoriteRepository.countByUserUserId(userId));
        dto.setPendingServiceAppointmentCount(serviceAppointmentRepository.countByUserUserIdAndStatusIn(
                userId,
                ACTIVE_APPOINTMENT_STATUSES));
        dto.setCompletedServiceAppointmentCount(serviceAppointmentRepository.countByUserUserIdAndStatus(
                userId,
                ServiceAppointment.AppointmentStatus.COMPLETED));
        return dto;
    }

    private UserOverviewDueLoanDto toDueSoonLoan(Loan loan, LocalDate today) {
        UserOverviewDueLoanDto dto = new UserOverviewDueLoanDto();
        dto.setLoanId(loan.getLoanId());
        dto.setBookId(loan.getCopy().getBook().getBookId());
        dto.setBookTitle(loan.getCopy().getBook().getTitle());
        dto.setDueDate(loan.getDueDate());
        dto.setDaysRemaining(ChronoUnit.DAYS.between(today, loan.getDueDate()));
        dto.setStatus(loan.getStatus().name());
        return dto;
    }

    private long defaultLong(Long value) {
        return value == null ? 0L : value;
    }

    private BigDecimal defaultAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
