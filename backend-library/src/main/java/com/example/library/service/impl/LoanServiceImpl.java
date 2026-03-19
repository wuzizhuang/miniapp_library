package com.example.library.service.impl;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.LoanService;
import com.example.library.service.NotificationService;
import com.example.library.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Default implementation of loan management.
 */
@Service
@RequiredArgsConstructor
public class LoanServiceImpl implements LoanService {

    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final BookCopyRepository bookCopyRepository;
    private final FineRepository fineRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final NotificationService notificationService;
    private static final Logger log = LoggerFactory.getLogger(LoanServiceImpl.class);

    @Value("${library.loan.max-active-loans:5}")
    private int maxActiveLoans;

    @Value("${library.loan.default-loan-days:14}")
    private int defaultLoanDays;

    @Value("${library.loan.max-renewals:2}")
    private int maxRenewals = 2;

    @Value("${library.loan.fine-per-day:1.00}")
    private BigDecimal finePerDay;

    /**
     * Returns paged loan records.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getAllLoans(int page, int size, String sortBy, String direction, String status) {
        Sort.Direction sortDirection = direction.equalsIgnoreCase("DESC") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        if (status != null && !status.isBlank()) {
            try {
                Loan.LoanStatus loanStatus = Loan.LoanStatus.valueOf(status.toUpperCase());
                return loanRepository.findByStatus(loanStatus, pageable).map(this::convertToDto);
            } catch (IllegalArgumentException ignored) {
                // 非法枚举值则忽略过滤条件，返回全部
            }
        }
        return loanRepository.findAll(pageable).map(this::convertToDto);
    }

    /**
     * Returns a user's loan records.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getLoansByUser(Integer userId, int page, int size) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id: " + userId);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "borrowDate"));
        return loanRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * Returns a user's active loans (not yet returned), paged.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getActiveLoans(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "borrowDate"));
        return loanRepository.findByUserUserIdAndStatusIn(userId,
                List.of(Loan.LoanStatus.ACTIVE, Loan.LoanStatus.OVERDUE), pageable)
                .map(this::convertToDto);
    }

    /**
     * Returns a loan by id.
     */
    @Override
    @Transactional(readOnly = true)
    public LoanDto getLoanById(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + loanId));
        return convertToDto(loan);
    }

    /**
     * Creates a new loan.
     */
    @Override
    @Transactional
    public LoanDto createLoan(LoanCreateDto loanCreateDto) {
        User user = userRepository.findById(loanCreateDto.getUserId())
                .orElseThrow(
                        () -> new ResourceNotFoundException("User not found with id: " + loanCreateDto.getUserId()));

        BookCopy bookCopy = bookCopyRepository.findByCopyIdWithLock(loanCreateDto.getCopyId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Book copy not found with id: " + loanCreateDto.getCopyId()));

        if (bookCopy.getBook().getStatus() == Book.BookStatus.INACTIVE) {
            throw new BadRequestException("Cannot borrow an inactive book");
        }

        if (bookCopy.getStatus() != BookCopy.CopyStatus.AVAILABLE) {
            throw new BadRequestException("Book copy is not available for borrowing");
        }

        Long pendingFinesCount = fineRepository.countPendingFinesForUser(user.getUserId());
        if (pendingFinesCount > 0) {
            throw new BadRequestException("User has pending fines that must be paid before borrowing");
        }

        Integer bookId = bookCopy.getBook().getBookId();
        List<Reservation> pendingReservations = reservationRepository.findPendingReservationsForBook(bookId);
        if (!pendingReservations.isEmpty()) {
            Reservation firstReservation = pendingReservations.get(0);
            if (!firstReservation.getUser().getUserId().equals(user.getUserId())) {
                throw new BadRequestException("此书已被其他用户预约，请等待可借副本或稍后重试");
            }
            firstReservation.setStatus(Reservation.ReservationStatus.FULFILLED);
            reservationRepository.save(firstReservation);
        }

        Long activeLoansCount = loanRepository.countActiveLoansForUser(user.getUserId());
        if (activeLoansCount >= maxActiveLoans) {
            throw new BadRequestException("User has reached the maximum number of active loans: " + maxActiveLoans);
        }

        Loan loan = new Loan();
        loan.setUser(user);
        loan.setCopy(bookCopy);
        loan.setBorrowDate(LocalDate.now());
        loan.setDueDate(LocalDate.now().plusDays(defaultLoanDays));
        loan.setStatus(Loan.LoanStatus.ACTIVE);
        loan.setRenewalCount(0);

        bookCopy.setStatus(BookCopy.CopyStatus.BORROWED);
        bookCopyRepository.save(bookCopy);

        Loan savedLoan = loanRepository.save(loan);
        notificationService.sendNotification(
                user.getUserId(),
                Notification.NotificationType.SYSTEM,
                "借阅成功",
                String.format("你已成功借阅《%s》，应还日期为 %s。",
                        bookCopy.getBook().getTitle(),
                        savedLoan.getDueDate()),
                "LOAN",
                String.valueOf(savedLoan.getLoanId()),
                "/my/loan-tracking",
                buildBusinessKey("LOAN_BORROW_SUCCESS", savedLoan.getLoanId()));
        return convertToDto(savedLoan);
    }

    /**
     * Returns a borrowed copy and applies fines if needed.
     */
    @Override
    @Transactional
    public LoanDto returnLoan(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.ACTIVE && loan.getStatus() != Loan.LoanStatus.OVERDUE) {
            throw new BadRequestException("Loan is already returned or lost");
        }

        loan.setReturnDate(LocalDate.now());
        loan.setStatus(Loan.LoanStatus.RETURNED);

        BookCopy bookCopy = loan.getCopy();

        boolean allocatedToReservation = reservationService.allocateInventoryForPendingReservations(bookCopy);

        if (allocatedToReservation) {
            log.info("Book returned and immediately allocated to pending reservation.");
        } else {
            bookCopy.setStatus(BookCopy.CopyStatus.AVAILABLE);
        }

        bookCopyRepository.save(bookCopy);

        if (loan.getDueDate().isBefore(LocalDate.now())) {
            long daysLate = ChronoUnit.DAYS.between(loan.getDueDate(), LocalDate.now());
            BigDecimal fineAmount = finePerDay.multiply(BigDecimal.valueOf(daysLate));

            Fine fine = new Fine();
            fine.setLoan(loan);
            fine.setUser(loan.getUser());
            fine.setAmount(fineAmount);
            fine.setReason("Late return: " + daysLate + " days overdue");
            fine.setDateIssued(LocalDate.now());
            fine.setStatus(Fine.FineStatus.PENDING);
            fineRepository.save(fine);
            notificationService.sendNotification(
                    loan.getUser().getUserId(),
                    Notification.NotificationType.SYSTEM,
                    "逾期罚款已生成",
                String.format("《%s》逾期归还，已生成罚款 %s 元。",
                        bookCopy.getBook().getTitle(),
                        fineAmount),
                "FINE",
                fine.getFineId() == null ? null : String.valueOf(fine.getFineId()),
                "/my/fines",
                buildBusinessKey("FINE_OVERDUE_CREATED", fine.getFineId()));
        }

        Loan updatedLoan = loanRepository.save(loan);
        return convertToDto(updatedLoan);
    }

    /**
     * Renews an active loan.
     */
    @Override
    @Transactional
    public LoanDto renewLoan(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.ACTIVE) {
            throw new BadRequestException("Only active loans can be renewed");
        }

        if (loan.getDueDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Overdue loans cannot be renewed");
        }

        if (loan.getRenewalCount() != null && loan.getRenewalCount() >= maxRenewals) {
            throw new BadRequestException("Renewal limit reached for this loan");
        }

        Long pendingFinesCount = fineRepository.countPendingFinesForUser(loan.getUser().getUserId());
        if (pendingFinesCount > 0) {
            throw new BadRequestException("User has pending fines that must be paid before renewing");
        }
        if (reservationRepository.existsConflictingActiveReservationForBook(
                loan.getCopy().getBook().getBookId(),
                loan.getUser().getUserId())) {
            throw new BadRequestException("This loan cannot be renewed because another reader is already waiting for the book");
        }

        loan.setDueDate(LocalDate.now().plusDays(defaultLoanDays));
        loan.setRenewalCount((loan.getRenewalCount() == null ? 0 : loan.getRenewalCount()) + 1);

        Loan updatedLoan = loanRepository.save(loan);
        return convertToDto(updatedLoan);
    }

    /**
     * Marks a loan as lost and creates a fine.
     */
    @Override
    @Transactional
    public LoanDto markLoanAsLost(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with id: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.ACTIVE && loan.getStatus() != Loan.LoanStatus.OVERDUE) {
            throw new BadRequestException("Loan is already returned or lost");
        }

        loan.setStatus(Loan.LoanStatus.LOST);

        BookCopy bookCopy = loan.getCopy();
        bookCopy.setStatus(BookCopy.CopyStatus.LOST);
        bookCopyRepository.save(bookCopy);

        Fine fine = new Fine();
        fine.setLoan(loan);
        fine.setUser(loan.getUser());
        fine.setAmount(bookCopy.getPrice());
        fine.setReason("Lost book: " + bookCopy.getBook().getTitle());
        fine.setDateIssued(LocalDate.now());
        fine.setStatus(Fine.FineStatus.PENDING);
        fineRepository.save(fine);
        notificationService.sendNotification(
                loan.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "图书遗失已登记",
                String.format("《%s》已标记为遗失，并生成赔付金额 %s 元。",
                        bookCopy.getBook().getTitle(),
                        bookCopy.getPrice()),
                "FINE",
                fine.getFineId() == null ? null : String.valueOf(fine.getFineId()),
                "/my/fines",
                buildBusinessKey("FINE_LOST_CREATED", fine.getFineId()));

        Loan updatedLoan = loanRepository.save(loan);
        return convertToDto(updatedLoan);
    }

    /**
     * Checks for overdue loans and updates their status.
     */
    @Override
    @Transactional
    public List<LoanDto> checkForOverdueLoans() {
        List<Loan> overdueLoans = loanRepository.findOverdueLoans(LocalDate.now());

        // Update status of overdue loans
        overdueLoans.forEach(loan -> {
            loan.setStatus(Loan.LoanStatus.OVERDUE);
            loanRepository.save(loan);
        });

        return overdueLoans.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Returns paged overdue loans (read-only, does not update status).
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getOverdueLoans(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dueDate"));
        return loanRepository.findByStatus(Loan.LoanStatus.OVERDUE, pageable)
                .map(this::convertToDto);
    }

    /**
     * 将 Loan 实体转换为 LoanDto
     */
    private LoanDto convertToDto(Loan loan) {
        LoanDto dto = new LoanDto();
        dto.setLoanId(loan.getLoanId());

        BookCopy copy = loan.getCopy();
        Book book = copy.getBook();

        dto.setCopyId(copy.getCopyId());
        dto.setBookId(book.getBookId());
        dto.setBookTitle(book.getTitle());
        dto.setBookIsbn(book.getIsbn());
        dto.setBookCoverUrl(book.getCoverUrl());
        dto.setLocationCode(copy.getLocationCode());

        // Author names (comma-separated)
        if (book.getBookAuthors() != null && !book.getBookAuthors().isEmpty()) {
            String authorNames = book.getBookAuthors().stream()
                    .map(ba -> ba.getAuthor().getName())
                    .collect(Collectors.joining(", "));
            dto.setBookAuthorNames(authorNames);
        }

        // Category name
        if (book.getCategory() != null) {
            dto.setCategoryName(book.getCategory().getName());
        }

        dto.setUserId(loan.getUser().getUserId());
        dto.setUsername(loan.getUser().getUsername());
        dto.setUserFullName(loan.getUser().getFullName());

        dto.setBorrowDate(loan.getBorrowDate());
        dto.setDueDate(loan.getDueDate());
        dto.setReturnDate(loan.getReturnDate());
        dto.setStatus(loan.getStatus());

        dto.setCreateTime(loan.getCreateTime());
        dto.setUpdateTime(loan.getUpdateTime());

        // Calculate days overdue / days remaining
        if (loan.getStatus() == Loan.LoanStatus.ACTIVE || loan.getStatus() == Loan.LoanStatus.OVERDUE) {
            long daysUntilDue = ChronoUnit.DAYS.between(LocalDate.now(), loan.getDueDate());
            if (daysUntilDue < 0) {
                dto.setDaysOverdue(Math.abs(daysUntilDue));
                dto.setDaysRemaining(0L);
            } else {
                dto.setDaysRemaining(daysUntilDue);
            }
        }

        dto.setRenewalCount(loan.getRenewalCount() == null ? 0 : loan.getRenewalCount());

        return dto;
    }

    private String buildBusinessKey(String prefix, Integer entityId) {
        return entityId == null ? null : prefix + ":" + entityId;
    }
}
