package com.example.library.service.impl;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ReservationCreateDto;
import com.example.library.dto.ReservationDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.ReservationService;
import com.example.library.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Default reservation service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final BookCopyRepository bookCopyRepository;
    private final NotificationService notificationService;
    private final LoanRepository loanRepository;
    private final FineRepository fineRepository;

    @Value("${library.reservation.pickup-window-days:3}")
    private int pickupWindowDays;
    @Value("${library.loan.max-active-loans:5}")
    private int maxActiveLoans;
    @Value("${library.loan.default-loan-days:14}")
    private int defaultLoanDays;

    /**
     * Creates a reservation and attempts immediate allocation.
     */
    @Override
    @Transactional
    public ReservationDto createReservation(ReservationCreateDto createDto) {
        User user = userRepository.findByIdForUpdate(createDto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Book book = bookRepository.findById(createDto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book not found"));

        List<Reservation> existingReservations = reservationRepository.findActiveReservationsByUserAndBook(
                user.getUserId(),
                book.getBookId(),
                PageRequest.of(0, 1));
        if (!existingReservations.isEmpty()) {
            return convertToDto(existingReservations.get(0));
        }

        Long activeCount = reservationRepository.countActiveReservationsForUser(user.getUserId());
        if (activeCount >= 5) {
            throw new BadRequestException("Max reservation limit reached");
        }

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setBook(book);
        reservation.setReservationDate(LocalDate.now());
        reservation.setExpiryDate(LocalDate.now().plusDays(14));
        reservation.setStatus(Reservation.ReservationStatus.PENDING);
        Reservation saved = reservationRepository.save(reservation);

        List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesByBookIdWithLock(
                book.getBookId(),
                PageRequest.of(0, 1));

        if (!availableCopies.isEmpty()) {
            BookCopy copyToLock = availableCopies.get(0);
            lockCopyToReservation(saved, copyToLock);
            saved = reservationRepository.save(saved);
            log.info("Reservation created and immediately locked copy ID: {}", copyToLock.getCopyId());
        } else {
            log.info("No copies available, reservation queued for Book ID: {}", book.getBookId());
        }
        if (saved.getStatus() == Reservation.ReservationStatus.PENDING) {
            notificationService.sendNotification(
                    user.getUserId(),
                    Notification.NotificationType.SYSTEM,
                    "预约成功",
                    String.format("你已成功预约《%s》，当前已进入排队队列。", book.getTitle()),
                    "RESERVATION",
                    saved.getReservationId() == null ? null : String.valueOf(saved.getReservationId()),
                    "/my/reservations",
                    buildBusinessKey("RESERVATION_CREATED", saved.getReservationId()));
        }
        return convertToDto(saved);
    }

    /**
     * Cancels a reservation and releases inventory if needed.
     */
    @Override
    @Transactional
    public void cancelReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() == Reservation.ReservationStatus.FULFILLED ||
                reservation.getStatus() == Reservation.ReservationStatus.EXPIRED) {
            throw new BadRequestException("Cannot cancel finished reservation");
        }

        reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        if (reservation.getAllocatedCopy() != null) {
            BookCopy copy = reservation.getAllocatedCopy();

            reservation.setAllocatedCopy(null);

            boolean assignedToNext = allocateInventoryForPendingReservations(copy);

            if (!assignedToNext) {
                copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
                bookCopyRepository.save(copy);
                log.info("Copy {} released to AVAILABLE pool", copy.getCopyId());
            }
        }
    }

    /**
     * Allocates a copy to the earliest pending reservation.
     */
    @Override
    @Transactional
    public boolean allocateInventoryForPendingReservations(BookCopy bookCopy) {
        List<Reservation> pendingList = reservationRepository
                .findPendingReservationsForBookWithLock(bookCopy.getBook().getBookId(), PageRequest.of(0, 1));

        if (pendingList.isEmpty()) {
            return false;
        }

        Reservation nextReservation = pendingList.get(0);

        lockCopyToReservation(nextReservation, bookCopy);

        reservationRepository.save(nextReservation);

        log.info("Inventory transferred: Copy {} allocated to User {}", bookCopy.getCopyId(),
                nextReservation.getUser().getUserId());
        return true;
    }

    /**
     * Marks a reservation as fulfilled.
     */
    @Override
    @Transactional
    public void fulfillReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() != Reservation.ReservationStatus.AWAITING_PICKUP) {
            throw new BadRequestException("Only reservations awaiting pickup can be fulfilled");
        }
        if (reservation.getAllocatedCopy() == null) {
            throw new BadRequestException("Reservation has no allocated copy to fulfill");
        }

        Long pendingFinesCount = fineRepository.countPendingFinesForUser(reservation.getUser().getUserId());
        if (pendingFinesCount > 0) {
            throw new BadRequestException("User has pending fines that must be paid before pickup");
        }

        Long activeLoansCount = loanRepository.countActiveLoansForUser(reservation.getUser().getUserId());
        if (activeLoansCount >= maxActiveLoans) {
            throw new BadRequestException("User has reached the maximum number of active loans: " + maxActiveLoans);
        }

        BookCopy copy = reservation.getAllocatedCopy();
        copy.setStatus(BookCopy.CopyStatus.BORROWED);
        bookCopyRepository.save(copy);

        Loan loan = new Loan();
        loan.setUser(reservation.getUser());
        loan.setCopy(copy);
        loan.setBorrowDate(LocalDate.now());
        loan.setDueDate(LocalDate.now().plusDays(defaultLoanDays));
        loan.setStatus(Loan.LoanStatus.ACTIVE);
        loanRepository.save(loan);

        reservation.setStatus(Reservation.ReservationStatus.FULFILLED);
        reservation.setPickupDeadline(null);
        reservationRepository.save(reservation);

        notificationService.sendNotification(
                reservation.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "预约取书已完成",
                String.format("你预约的《%s》已完成借阅，应还日期为 %s。",
                        reservation.getBook().getTitle(),
                        loan.getDueDate()),
                "LOAN",
                loan.getLoanId() == null ? null : String.valueOf(loan.getLoanId()),
                "/my/loan-tracking",
                buildBusinessKey("RESERVATION_FULFILLED_TO_LOAN", loan.getLoanId()));
    }

    /**
     * Returns reservations for a user.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> getUserReservations(Integer userId, Pageable pageable) {
        return reservationRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * Returns reservations for admin.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> getAllReservations(Reservation.ReservationStatus status, Pageable pageable) {
        return getAllReservations(status, null, pageable);
    }

    /**
     * Returns reservations for admin with keyword search.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> getAllReservations(Reservation.ReservationStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return reservationRepository.searchForAdmin(status, normalizedKeyword, pageable)
                .map(this::convertToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DashboardBreakdownItemDto> getReservationStatusStats(String keyword) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Map<Reservation.ReservationStatus, Long> counts = new EnumMap<>(Reservation.ReservationStatus.class);

        for (Object[] row : reservationRepository.countGroupedByStatusForAdmin(normalizedKeyword)) {
            Reservation.ReservationStatus status = (Reservation.ReservationStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status, count);
        }

        return List.of(
                createBreakdownItem("PENDING", "排队中", counts.getOrDefault(Reservation.ReservationStatus.PENDING, 0L)),
                createBreakdownItem(
                        "AWAITING_PICKUP",
                        "待取书",
                        counts.getOrDefault(Reservation.ReservationStatus.AWAITING_PICKUP, 0L)),
                createBreakdownItem(
                        "FULFILLED",
                        "已完成",
                        counts.getOrDefault(Reservation.ReservationStatus.FULFILLED, 0L)),
                createBreakdownItem(
                        "CANCELLED",
                        "已取消",
                        counts.getOrDefault(Reservation.ReservationStatus.CANCELLED, 0L)),
                createBreakdownItem(
                        "EXPIRED",
                        "已过期",
                        counts.getOrDefault(Reservation.ReservationStatus.EXPIRED, 0L)));
    }

    /**
     * Locks a copy for a reservation and sets pickup window.
     */
    private void lockCopyToReservation(Reservation reservation, BookCopy copy) {
        copy.setStatus(BookCopy.CopyStatus.RESERVED);
        bookCopyRepository.save(copy);

        reservation.setAllocatedCopy(copy);
        reservation.setStatus(Reservation.ReservationStatus.AWAITING_PICKUP);
        reservation.setPickupDeadline(LocalDateTime.now().plusDays(pickupWindowDays));

        reservation.setNotificationSent(true);
        notificationService.sendNotification(
                reservation.getUser().getUserId(),
                Notification.NotificationType.ARRIVAL_NOTICE,
                "预约书籍已可取",
                String.format("你预约的《%s》已为你预留，请在 %s 前到馆取书。",
                        reservation.getBook().getTitle(),
                        reservation.getPickupDeadline().toLocalDate()),
                "RESERVATION",
                reservation.getReservationId() == null ? null : String.valueOf(reservation.getReservationId()),
                "/my/reservations",
                buildBusinessKey("RESERVATION_READY_FOR_PICKUP", reservation.getReservationId()));
    }

    /**
     * Expires overdue reservations and releases copies.
     */
    @Override
    @Transactional(readOnly = true)
    public void checkAndExpireReservations() {
        List<Reservation> expiredReservations = reservationRepository
                .findExpiredPickupReservations(LocalDateTime.now());

        for (Reservation reservation : expiredReservations) {
            log.info("Expiring reservation {} for User {}", reservation.getReservationId(),
                    reservation.getUser().getUserId());

            reservation.setStatus(Reservation.ReservationStatus.EXPIRED);

            BookCopy copy = reservation.getAllocatedCopy();
            reservation.setAllocatedCopy(null);

            if (copy != null) {
                boolean givenToNext = allocateInventoryForPendingReservations(copy);
                if (!givenToNext) {
                    copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
                    bookCopyRepository.save(copy);
                }
            }
            reservationRepository.save(reservation);
        }
    }

    private ReservationDto convertToDto(Reservation r) {
        ReservationDto dto = new ReservationDto();
        dto.setReservationId(r.getReservationId());
        dto.setBookId(r.getBook().getBookId());
        dto.setBookTitle(r.getBook().getTitle());
        dto.setBookIsbn(r.getBook().getIsbn());
        dto.setCoverUrl(r.getBook().getCoverUrl());
        dto.setUserId(r.getUser().getUserId());
        dto.setUsername(r.getUser().getUsername());
        dto.setUserFullName(r.getUser().getFullName());
        dto.setReservationDate(r.getReservationDate());
        dto.setExpiryDate(r.getExpiryDate());
        dto.setStatus(r.getStatus());
        dto.setNotificationSent(r.getNotificationSent());

        if (r.getAllocatedCopy() != null) {
            dto.setAllocatedCopyId(r.getAllocatedCopy().getCopyId());
            dto.setLocationCode(r.getAllocatedCopy().getLocationCode());
        }
        dto.setPickupDeadline(r.getPickupDeadline());
        dto.setQueuePosition(resolveQueuePosition(r));
        return dto;
    }

    private Integer resolveQueuePosition(Reservation reservation) {
        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING) {
            return null;
        }

        List<Reservation> queue = reservationRepository.findPendingQueueForBook(reservation.getBook().getBookId());
        for (int i = 0; i < queue.size(); i++) {
            if (queue.get(i).getReservationId().equals(reservation.getReservationId())) {
                return i + 1;
            }
        }

        return null;
    }

    private DashboardBreakdownItemDto createBreakdownItem(String key, String label, Long value) {
        DashboardBreakdownItemDto dto = new DashboardBreakdownItemDto();
        dto.setKey(key);
        dto.setLabel(label);
        dto.setValue(value);
        return dto;
    }

    private String buildBusinessKey(String prefix, Integer entityId) {
        return entityId == null ? null : prefix + ":" + entityId;
    }
}
